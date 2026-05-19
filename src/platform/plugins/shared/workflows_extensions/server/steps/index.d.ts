import type { CoreSetup } from '@kbn/core/server';
import type { ServerStepRegistry } from '../step_registry/step_registry';
import type { WorkflowsExtensionsServerPluginStartDeps } from '../types';
export declare const registerInternalStepDefinitions: (core: CoreSetup<WorkflowsExtensionsServerPluginStartDeps>, serverStepRegistry: ServerStepRegistry) => void;
