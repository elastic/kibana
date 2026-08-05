/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useEffect, useMemo, useState } from 'react';
import { TypeRegistry } from '@kbn/alerts-ui-shared/lib';
import { type ConnectorSpec, connectorsSpecs } from '@kbn/connector-specs';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { Logger } from '@kbn/logging';
import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public';
import type {
  PublicStepDefinition,
  PublicTriggerDefinition,
  WorkflowsExtensionsPublicPluginStart,
} from '@kbn/workflows-extensions/public';
import {
  PublicStepRegistry,
  PublicTriggerRegistry,
  registerInternalStepDefinitions,
  registerInternalTriggerDefinitions,
} from '@kbn/workflows-extensions/public';
import { z } from '@kbn/zod/v4';
import { StepIcon } from './step_icon';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';
import { triggerSchemas } from '../../../trigger_schemas';
import { TriggerIcon } from '../../../widgets/worflows_triggers_list/worflows_triggers_list';

// Covers StepIcon and TriggerIcon together: the workflow list renders both side by
// side, and a regression in either shows up as a plugs glyph in the same column.
export default {
  title: 'Workflow icons',
  decorators: [kibanaReactDecorator],
};

const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  trace: () => {},
  log: () => {},
  get: () => nullLogger,
  isLevelEnabled: () => false,
} as unknown as Logger;

interface LoadedExtensions {
  stepDefs: PublicStepDefinition[];
  triggerDefs: PublicTriggerDefinition[];
}

// Cases registers these five at runtime. Its plugin is in x-pack and this one is
// platform, so the story can't import the definitions — but it can import the same
// EUI glyph they carry, so what renders here matches what Kibana renders.
const CASES_TRIGGER_FIXTURES: PublicTriggerDefinition[] = [
  ['cases.caseCreated', 'Case created'],
  ['cases.caseUpdated', 'Case updated'],
  ['cases.caseStatusUpdated', 'Case status updated'],
  ['cases.attachmentsAdded', 'Attachments added'],
  ['cases.commentsAdded', 'Comments added'],
].map(([id, title]) => ({
  id,
  title,
  description: title,
  eventSchema: z.object({}),
  stability: 'tech_preview',
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/briefcase').then(({ icon }) => ({
      default: icon,
    }))
  ),
}));

const loadExtensions = async (): Promise<LoadedExtensions> => {
  const stepRegistry = new PublicStepRegistry(nullLogger);
  const triggerRegistry = new PublicTriggerRegistry();
  registerInternalStepDefinitions(stepRegistry);
  registerInternalTriggerDefinitions(triggerRegistry);
  for (const fixture of CASES_TRIGGER_FIXTURES) {
    triggerRegistry.register(fixture);
  }
  await Promise.all([stepRegistry.whenReady(), triggerRegistry.whenReady()]);
  return { stepDefs: stepRegistry.getAll(), triggerDefs: triggerRegistry.getAll() };
};

const buildWorkflowsExtensionsFromRegistry = ({
  stepDefs,
  triggerDefs,
}: LoadedExtensions): WorkflowsExtensionsPublicPluginStart => ({
  getStepDefinition: (id) => stepDefs.find((d) => d.id === id),
  getAllStepDefinitions: () => stepDefs,
  hasStepDefinition: (id) => stepDefs.some((d) => d.id === id),
  getTriggerDefinition: (id) => triggerDefs.find((d) => d.id === id),
  getAllTriggerDefinitions: () => triggerDefs,
  hasTriggerDefinition: (id) => triggerDefs.some((d) => d.id === id),
  isReady: async () => {},
});

const allConnectorSpecs: ConnectorSpec[] = Object.values(connectorsSpecs);

// Mirrors stack_connectors' runtime resolution: inline icon → ConnectorIconsMap → plugs.
const resolveConnectorIcon = (spec: ConnectorSpec) =>
  spec.metadata.icon ?? ConnectorIconsMap.get(spec.metadata.id) ?? 'plugs';

const buildSpecActionTypeRegistry = () => {
  const registry = new TypeRegistry<ActionTypeModel>();
  for (const spec of allConnectorSpecs) {
    registry.register({
      id: spec.metadata.id,
      iconClass: resolveConnectorIcon(spec),
    } as unknown as ActionTypeModel);
  }
  return registry;
};

// Nested KibanaContextProvider shadows the outer decorator's empty mocks, so
// `useKibana()` inside StepIcon reads the seeded extensions + action type registry.
// TriggerIcon resolves through the `triggerSchemas` singleton rather than context,
// so that needs seeding too or every custom trigger falls back to bolt.
const SeededKibanaProvider: React.FC<{
  extensions: LoadedExtensions;
  children: React.ReactNode;
}> = ({ extensions, children }) => {
  const services = useMemo(() => {
    const workflowsExtensions = buildWorkflowsExtensionsFromRegistry(extensions);
    triggerSchemas.initialize(workflowsExtensions);
    return {
      triggersActionsUi: {
        actionTypeRegistry: buildSpecActionTypeRegistry(),
        ruleTypeRegistry: new TypeRegistry(),
      },
      workflowsExtensions,
    } as unknown as Parameters<typeof KibanaContextProvider>[0]['services'];
  }, [extensions]);

  return <KibanaContextProvider services={services}>{children}</KibanaContextProvider>;
};

const useRealExtensions = () => {
  const [extensions, setExtensions] = useState<LoadedExtensions | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadExtensions().then((next) => {
      if (!cancelled) setExtensions(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return extensions;
};

const LoadingIndicator = () => (
  <EuiFlexGroup alignItems="center" gutterSize="s">
    <EuiFlexItem grow={false}>
      <EuiLoadingSpinner size="m" />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiText size="s">{'Loading @kbn/workflows-extensions step definitions…'}</EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const baseTypeFor = (id: string): string => {
  if (id.startsWith('elasticsearch.')) return 'elasticsearch';
  if (id.startsWith('kibana.')) return 'kibana';
  if (id.startsWith('slack_api')) return 'slack';
  return id.split('.')[0];
};

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <EuiFlexItem>
    <EuiTitle size="xs">
      <h3>{title}</h3>
    </EuiTitle>
    {subtitle && (
      <EuiText size="xs" color="subdued">
        {subtitle}
      </EuiText>
    )}
  </EuiFlexItem>
);

interface IconRow {
  icon: React.ReactNode;
  primary: string;
  secondary?: string;
}

const IconRowGrid = ({ rows, columns = 4 }: { rows: IconRow[]; columns?: 1 | 2 | 3 | 4 }) => (
  <EuiFlexGrid columns={columns} gutterSize="m">
    {rows.map(({ icon, primary, secondary }) => (
      <EuiFlexItem key={primary} grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <span style={{ fontFamily: 'monospace' }}>{primary}</span>
            </EuiText>
            {secondary && (
              <EuiText size="xs" color="subdued">
                {secondary}
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    ))}
  </EuiFlexGrid>
);

const stepIconOf = (type: string) => (
  <StepIcon stepType={type} executionStatus={undefined} title={type} />
);

const BUILT_IN_TRIGGER_TYPES = ['manual', 'alert', 'scheduled'];

const builtInStepTypes = [
  'http',
  'console',
  'wait',
  'waitForInput',
  'if',
  'foreach',
  'while',
  'switch',
  'loop.break',
  'loop.continue',
  'data.set',
  'workflow.execute',
  'workflow.executeAsync',
  'workflow.output',
  'slack',
  'slack_api',
  'email',
  'inference',
  'elasticsearch.search',
  'kibana.request',
];

const CatalogBody = ({ extensions }: { extensions: LoadedExtensions }) => {
  const { stepDefs, triggerDefs } = extensions;

  const triggerRows: IconRow[] = [
    ...BUILT_IN_TRIGGER_TYPES.map((type) => ({
      icon: <TriggerIcon triggerType={type} />,
      primary: type,
      secondary: 'built-in',
    })),
    ...triggerDefs.map((def) => ({
      icon: <TriggerIcon triggerType={def.id} />,
      primary: def.id,
      secondary: def.title,
    })),
  ];

  const builtInRows: IconRow[] = builtInStepTypes.map((type) => ({
    icon: stepIconOf(type),
    primary: type,
  }));

  const extensionRows: IconRow[] = [...stepDefs]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((def) => ({
      icon: stepIconOf(def.id),
      primary: def.id,
      secondary: `base: ${baseTypeFor(def.id)}${def.icon ? '' : ' (no icon — falls back)'}`,
    }));

  const connectorRows: IconRow[] = [...allConnectorSpecs]
    .sort((a, b) => a.metadata.displayName.localeCompare(b.metadata.displayName))
    .map((spec) => {
      const id = spec.metadata.id;
      const base = baseTypeFor(id.startsWith('.') ? id.slice(1) : id);
      return {
        icon: stepIconOf(base),
        primary: base,
        secondary: spec.metadata.displayName,
      };
    });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <SectionHeader
        title={`Triggers (${BUILT_IN_TRIGGER_TYPES.length} built-in + ${triggerDefs.length} custom)`}
        subtitle="Rendered by TriggerIcon. cases.* are local fixtures — see CASES_TRIGGER_FIXTURES."
      />
      <IconRowGrid rows={triggerRows} columns={4} />

      <SectionHeader
        title="Built-in step types"
        subtitle="Resolved by getStepIconType / HardcodedIcons, no extension lookup."
      />
      <IconRowGrid rows={builtInRows} columns={4} />

      <SectionHeader
        title={`Extension step definitions (${extensionRows.length} from @kbn/workflows-extensions)`}
        subtitle="Only the defs that package ships. cases.* and ai.agent are registered at runtime by Cases / Agent Builder."
      />
      <IconRowGrid rows={extensionRows} columns={4} />

      <SectionHeader
        title={`Connector specs (${connectorRows.length} from @kbn/connector-specs)`}
        subtitle="Bare base types, as the workflow list shows them (`aws_lambda` for `.aws_lambda`)."
      />
      <IconRowGrid rows={connectorRows} columns={4} />
    </EuiFlexGroup>
  );
};

export const Catalog = () => {
  const extensions = useRealExtensions();
  if (!extensions) return <LoadingIndicator />;
  return (
    <SeededKibanaProvider extensions={extensions}>
      <CatalogBody extensions={extensions} />
    </SeededKibanaProvider>
  );
};

// `expected` is what the row must render; a plugs glyph anywhere but the last two
// means the resolution chain regressed.
const baseTypeCases: Array<{ baseType: string; expected: string }> = [
  { baseType: 'ai', expected: 'productAgent' },
  { baseType: 'workflow', expected: 'workflow.execute glyph' },
  { baseType: 'data', expected: 'database' },
  { baseType: 'aws_lambda', expected: 'AWS Lambda logo' },
  { baseType: 'slack', expected: 'logoSlack' },
  { baseType: 'elasticsearch', expected: 'logoElasticsearch' },
  { baseType: 'kibana', expected: 'logoKibana' },
  { baseType: 'virustotal', expected: 'VirusTotal logo' },
  { baseType: 'cases', expected: 'plugs here, briefcase in Kibana (registered at runtime)' },
  { baseType: 'some_unknown_type', expected: 'plugs' },
];

const BaseTypeAggregationBody = () => (
  <EuiFlexGroup direction="column" gutterSize="l">
    <SectionHeader
      title="Base type aggregation (workflow list rows)"
      subtitle="The list collapses `ai.summarize` + `ai.agent` → `ai`, `workflow.execute` + `workflow.output` → `workflow`, then hands StepIcon the bare base type."
    />
    <IconRowGrid
      rows={baseTypeCases.map(({ baseType, expected }) => ({
        icon: stepIconOf(baseType),
        primary: baseType,
        secondary: `expected: ${expected}`,
      }))}
      columns={2}
    />
  </EuiFlexGroup>
);

export const BaseTypeAggregation = () => {
  const extensions = useRealExtensions();
  if (!extensions) return <LoadingIndicator />;
  return (
    <SeededKibanaProvider extensions={extensions}>
      <BaseTypeAggregationBody />
    </SeededKibanaProvider>
  );
};
