/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderRunAs } from './render_bound_yaml';
import type { ManagedWorkflowDefinition, ManagedWorkflowTemplateValues } from './types';

/** The one template value a bound workflow takes: the account its `settings.run_as` names. */
export interface IBoundWorkflowValues extends ManagedWorkflowTemplateValues {
  /** The service account the workflow runs as. */
  serviceAccountId: string;
}

/**
 * Defines a managed workflow that is installed once per space, with the space id as the document
 * id suffix, and bound to a service account. `yaml` carries the `run_as: __SERVICE_ACCOUNT_ID__`
 * placeholder that installing replaces. `pluginId` is the plugin that owns the workflow.
 */
export function defineBoundWorkflow<TId extends string, TPluginId extends string>({
  id,
  pluginId,
  yaml,
}: {
  id: TId;
  pluginId: TPluginId;
  yaml: string;
}) {
  return {
    id,
    pluginId,
    version: 1,
    billable: false,
    yamlTemplate: ({ serviceAccountId }: IBoundWorkflowValues): string =>
      renderRunAs(yaml, serviceAccountId),
    management: {
      lifecycle: 'dynamic',
      versionStrategy: 'auto',
      enablement: 'restorable',
    },
  } as const satisfies ManagedWorkflowDefinition<IBoundWorkflowValues>;
}
