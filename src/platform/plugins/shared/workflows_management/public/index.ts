/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { WorkflowsPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin(initializerContext: PluginInitializerContext) {
  return new WorkflowsPlugin(initializerContext);
}
export type { WorkflowsPublicPluginSetup, WorkflowsPublicPluginStart } from './types';

// Public exports consumed by sibling plugins (e.g. agentBuilderWorkflows).
// Kibana's browser bundler only allows imports through this public entry,
// so anything reused cross-plugin must be re-exported here.
export { PLUGIN_ID } from '../common';
export type { TelemetryServiceClient } from './common/lib/telemetry/types';
export { WorkflowsBaseTelemetry } from './common/service/telemetry';
export { queryClient } from './shared/lib/query_client';
export {
  useWorkflowsMonacoTheme,
  WORKFLOWS_MONACO_EDITOR_THEME,
} from './widgets/workflow_yaml_editor/styles/use_workflows_monaco_theme';
