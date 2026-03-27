/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { trimStart } from 'lodash';
import type { OpeningAndClosingTags } from 'mustache';
import Mustache from 'mustache';
import { parse } from 'yaml';
import { getWorkflowTemplatesForConnector } from '@kbn/connector-specs';
import type { WorkflowRunFixture } from '@kbn/workflows-execution-engine/integration_tests/workflow_run_fixture';
import { ServerStepRegistry } from '@kbn/workflows-extensions/server/step_registry/step_registry';
import { registerInternalStepDefinitions } from '@kbn/workflows-extensions/server/steps';
import { APPROVED_STEP_DEFINITIONS } from '@kbn/workflows-extensions/test/scout/api/fixtures/approved_step_definitions';
import { validateWorkflowYaml } from '../../common/lib/validate_workflow_yaml';
import { WORKFLOW_ZOD_SCHEMA } from '../../common/schema';

const TEMPLATE_DELIMITERS: OpeningAndClosingTags = ['<%=', '%>'];

const internalRegistry = new ServerStepRegistry();
registerInternalStepDefinitions(
  {} as unknown as Parameters<typeof registerInternalStepDefinitions>[0],
  internalRegistry
);

const CORE_STEPS = new Map<string, { id: string; handler: Function }>(
  internalRegistry.getAll().map((def) => [def.id, def])
);

const approvedStepIds = new Set(APPROVED_STEP_DEFINITIONS.map((d) => d.id));

/**
 * Populates a WorkflowRunFixture with custom step definitions.
 *
 * All workflows_extensions core steps (data.*, ai.*) are registered
 * automatically with their real production handlers.
 *
 * Steps from other plugins (search.rerank, cases.*, ai.agent) are recognised
 * as valid custom step types (via APPROVED_STEP_DEFINITIONS) so the engine
 * routes them correctly, but invoking one without a handler provided via
 * additionalSteps will fail with a clear message telling you what to do.
 */
export function registerExtensionSteps(
  fixture: WorkflowRunFixture,
  additionalSteps?: Array<{ id: string; handler: Function }>
) {
  const steps = new Map(CORE_STEPS);
  for (const step of additionalSteps ?? []) {
    steps.set(step.id, step);
  }

  (fixture.dependencies.workflowsExtensions.hasStepDefinition as jest.Mock).mockImplementation(
    (type: string) => steps.has(type) || approvedStepIds.has(type)
  );
  (fixture.dependencies.workflowsExtensions.getStepDefinition as jest.Mock).mockImplementation(
    (type: string) => {
      const def = steps.get(type);
      if (def) return def;
      if (approvedStepIds.has(type)) {
        return {
          id: type,
          handler: async () => {
            throw new Error(
              `Step "${type}" is a real production step but its handler is not available ` +
                `in this test context. Either import it from the plugin that owns it ` +
                `or provide a mock handler via the additionalSteps parameter.`
            );
          },
        };
      }
      return undefined;
    }
  );
}

export function getWorkflowYaml(workflows: ProcessedWorkflow[], nameSubstring: string): string {
  const wf = workflows.find((w) => w.name.includes(nameSubstring));
  if (!wf) {
    throw new Error(
      `No workflow found matching '${nameSubstring}'. Available: ${workflows
        .map((w) => w.name)
        .join(', ')}`
    );
  }
  return wf.yaml;
}

export interface ProcessedWorkflow {
  yaml: string;
  name: string;
  valid: boolean;
  liquidErrors: string[];
}

/**
 * Loads workflows from a connector spec's agentBuilderWorkflows templates.
 *
 * This mirrors the production path used by the connector lifecycle handler:
 *   getWorkflowTemplatesForConnector -> Mustache.render -> parse/validate
 */
export function loadWorkflowsFromConnectorSpec(
  connectorTypeId: string,
  options?: { connectorName?: string }
): ProcessedWorkflow[] {
  const connectorName = options?.connectorName ?? 'fake-connector';
  const connectorTypeKey = trimStart(connectorTypeId, '.');
  const templateInputs = { [`${connectorTypeKey}-stack-connector-id`]: connectorName };

  const templates = getWorkflowTemplatesForConnector(connectorTypeId);
  if (templates.length === 0) {
    throw new Error(
      `No agentBuilderWorkflows found for connector type '${connectorTypeId}'. ` +
        `Ensure the connector spec exports an agentBuilderWorkflows array.`
    );
  }

  return templates.map((rawYaml) => {
    const rendered = Mustache.render(rawYaml, templateInputs, {}, TEMPLATE_DELIMITERS);
    const validation = validateWorkflowYaml(rendered, WORKFLOW_ZOD_SCHEMA);
    const liquidErrors = validation.diagnostics
      .filter((d) => d.source === 'liquid')
      .map((d) => d.message);
    const parsedYaml = parse(rendered);
    const name = parsedYaml?.name ?? 'unknown';

    return { yaml: rendered, name, valid: validation.valid, liquidErrors };
  });
}
