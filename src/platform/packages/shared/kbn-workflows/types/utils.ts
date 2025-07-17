/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowYaml } from '../spec/schema';
import { EsWorkflow, EsWorkflowTrigger, WorkflowStatus } from './v1';

export function transformWorkflowYamlJsontoEsWorkflow(
  workflow: Partial<WorkflowYaml>
): Omit<EsWorkflow, 'id' | 'createdAt' | 'createdBy' | 'lastUpdatedAt' | 'lastUpdatedBy' | 'yaml'> {
  const { name, description, tags, enabled, triggers, steps } = workflow.workflow!;

  const triggersMap = {
    'triggers.elastic.detectionRule': 'detection-rule',
    'triggers.elastic.scheduled': 'schedule',
    'triggers.elastic.manual': 'manual',
  };

  const connectorTypeMap = {
    console: 'console',
    'slack.sendMessage': 'slack-connector',
    delay: 'delay',
  };

  const defaultConnectorNameMap = {
    console: 'console',
    delay: 'delay',
  };

  // TODO: handle merge, if, foreach, etc.

  return {
    name,
    description,
    tags: tags ?? [],
    status: enabled ? WorkflowStatus.ACTIVE : WorkflowStatus.DRAFT,
    triggers: triggers?.map((trigger) => ({
      id: trigger.type,
      type: triggersMap[trigger.type] as EsWorkflowTrigger['type'],
      enabled: true,
      config: trigger.type === 'triggers.elastic.detectionRule' ? { ...trigger.with } : {},
    })),
    steps: steps?.map((step) => ({
      id: step.name,
      connectorType: connectorTypeMap[step.type as keyof typeof connectorTypeMap],
      // @ts-expect-error TODO: fix once the schema is stable
      connectorName:
        step?.['connector-id'] ??
        defaultConnectorNameMap?.[step.type as keyof typeof defaultConnectorNameMap] ??
        undefined,
      // @ts-expect-error TODO: fix once the schema is stable
      inputs: step?.with ?? {},
    })),
  };
}

export function transformEsWorkflowToYamlJson(workflow: Omit<EsWorkflow, 'id'>): WorkflowYaml {
  const triggersMap = {
    'detection-rule': 'triggers.elastic.detectionRule',
    schedule: 'triggers.elastic.scheduled',
    manual: 'triggers.elastic.manual',
  };

  const connectorTypeMap = {
    console: 'console',
    'slack-connector': 'slack.sendMessage',
    delay: 'delay',
  };

  return {
    workflow: {
      name: workflow.name,
      enabled: workflow.status === WorkflowStatus.ACTIVE,
      triggers: workflow.triggers.map((trigger) => ({
        type: triggersMap[trigger.type] as EsWorkflowTrigger['type'],
        with: trigger.type === 'manual' ? undefined : { ...trigger.config },
      })),
      steps: workflow.steps.map((step) => ({
        name: step.id,
        type: connectorTypeMap[step.connectorType as keyof typeof connectorTypeMap],
        'connector-id': step.connectorName,
        with: step.inputs,
      })),
    },
  };
}
