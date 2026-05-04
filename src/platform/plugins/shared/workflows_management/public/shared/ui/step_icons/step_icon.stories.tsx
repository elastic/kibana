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
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Suspense, useEffect, useState } from 'react';
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
import { StepIcon } from './step_icon';
import { kibanaReactDecorator } from '../../../../.storybook/decorators';

export default {
  title: 'StepIcon',
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

// Only the internal defs shipped by `@kbn/workflows-extensions`. Runtime-registered
// defs from other plugins (cases, agent_builder, …) are intentionally absent — the
// Catalog story calls that out.
const loadExtensions = async (): Promise<LoadedExtensions> => {
  const stepRegistry = new PublicStepRegistry(nullLogger);
  const triggerRegistry = new PublicTriggerRegistry();
  registerInternalStepDefinitions(stepRegistry);
  registerInternalTriggerDefinitions(triggerRegistry);
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
const SeededKibanaProvider: React.FC<{
  extensions: LoadedExtensions;
  children: React.ReactNode;
}> = ({ extensions, children }) => (
  <KibanaContextProvider
    services={
      {
        triggersActionsUi: {
          actionTypeRegistry: buildSpecActionTypeRegistry(),
          ruleTypeRegistry: new TypeRegistry(),
        },
        workflowsExtensions: buildWorkflowsExtensionsFromRegistry(extensions),
      } as unknown as Parameters<typeof KibanaContextProvider>[0]['services']
    }
  >
    {children}
  </KibanaContextProvider>
);

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
  return id.includes('.') ? id.split('.')[0] : id;
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

const IconRowGrid = ({ rows, columns = 3 }: { rows: IconRow[]; columns?: 1 | 2 | 3 | 4 }) => (
  <EuiFlexGrid columns={columns} gutterSize="m">
    {rows.map(({ icon, primary, secondary }) => (
      <EuiFlexItem key={primary} grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>{icon}</EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <pre style={{ margin: 0, padding: 0 }}>{primary}</pre>
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

// Mirrors `TriggerIcon` in worflows_triggers_list.tsx.
const BUILT_IN_TRIGGER_ICONS: Record<string, string> = {
  manual: 'play',
  alert: 'warning',
  scheduled: 'clock',
};

const TriggerIconFromRegistry = ({
  type,
  triggerDefs,
}: {
  type: string;
  triggerDefs: PublicTriggerDefinition[];
}) => {
  const hardcoded = BUILT_IN_TRIGGER_ICONS[type];
  if (hardcoded) return <EuiIcon type={hardcoded} size="m" title={type} />;
  const def = triggerDefs.find((d) => d.id === type);
  if (def?.icon) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="s" />}>
        <EuiIcon type={def.icon} size="m" title={type} />
      </Suspense>
    );
  }
  return <EuiIcon type="bolt" size="m" title={type} />;
};

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
      icon: <TriggerIconFromRegistry type={type} triggerDefs={triggerDefs} />,
      primary: type,
      secondary: 'built-in',
    })),
    ...triggerDefs.map((def) => ({
      icon: <TriggerIconFromRegistry type={def.id} triggerDefs={triggerDefs} />,
      primary: def.id,
      secondary: `custom (${def.title ?? def.id})`,
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
        primary: spec.metadata.displayName,
        secondary: `${id} → base: ${base}`,
      };
    });

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <SectionHeader
        title={`Triggers (${BUILT_IN_TRIGGER_TYPES.length} built-in + ${triggerDefs.length} custom)`}
        subtitle="Raw `type` values users write in the workflow YAML. Custom triggers come from @kbn/workflows-extensions — additional ones may be registered by other plugins at runtime."
      />
      <IconRowGrid rows={triggerRows} columns={2} />

      <SectionHeader
        title="Built-in step types"
        subtitle="Types handled by getStepIconType / HardcodedIcons — no extension lookup needed."
      />
      <IconRowGrid rows={builtInRows} columns={3} />

      <SectionHeader
        title={`Extension step definitions (${extensionRows.length} from @kbn/workflows-extensions)`}
        subtitle="Only the defs this package ships (data.*, ai.*). cases.* and ai.agent are registered by the Cases / Agent Builder plugins at runtime and appear in real Kibana but not here."
      />
      <IconRowGrid rows={extensionRows} columns={3} />

      <SectionHeader
        title={`Connector specs (${connectorRows.length} from @kbn/connector-specs)`}
        subtitle="Rendered as the workflow list table shows them (bare base type, e.g. `aws_lambda` for `.aws_lambda`)."
      />
      <IconRowGrid rows={connectorRows} columns={2} />
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

const baseTypeCases: Array<{ baseType: string; expected: string }> = [
  { baseType: 'ai', expected: 'productAgent (robot — BASE_TYPE_AGGREGATE_ICONS)' },
  { baseType: 'workflow', expected: 'workflow.execute glyph (BASE_TYPE_AGGREGATE_ICONS)' },
  { baseType: 'data', expected: 'database (via data.map family inheritance)' },
  {
    baseType: 'cases',
    expected:
      'plugs in Storybook (cases.* is registered by the Cases plugin at runtime only; in Kibana it resolves to briefcase)',
  },
  { baseType: 'aws_lambda', expected: 'AWS Lambda logo (via .aws_lambda actionTypeRegistry)' },
  { baseType: 'slack', expected: 'logoSlack (hardcoded)' },
  { baseType: 'elasticsearch', expected: 'logoElasticsearch (hardcoded prefix match)' },
  { baseType: 'kibana', expected: 'logoKibana (hardcoded prefix match)' },
  {
    baseType: 'virustotal',
    expected: 'VirusTotal logo (via .virustotal actionTypeRegistry + ConnectorIconsMap)',
  },
  { baseType: 'some_unknown_type', expected: 'plugs (legitimate unknown fallback)' },
];

const BaseTypeAggregationBody = () => (
  <EuiFlexGroup direction="column" gutterSize="l">
    <SectionHeader
      title="Base type aggregation (workflow list rows)"
      subtitle="StepIcon receives bare base types after the list deduplicates `ai.summarize` + `ai.agent` → `ai`, `workflow.execute` + `workflow.output` → `workflow`, etc. Each row names the icon the aggregation must produce — if a row goes plugs (except `some_unknown_type`), the resolution chain has regressed."
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
