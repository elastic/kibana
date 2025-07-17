import type { CoreSetup } from '@kbn/core/server';
import { WorkflowsExamplePluginStartDeps } from '../types';

export function defineRoutes(
  core: CoreSetup<WorkflowsExamplePluginStartDeps, WorkflowsExamplePluginStartDeps>
) {
  const router = core.http.createRouter();
}
