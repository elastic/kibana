import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import { type TracesContextService } from '../traces';
import { type ErrorsContextService } from './errors/errors_context_service';
export interface ApmContextService {
    tracesService: TracesContextService;
    errorsService: ErrorsContextService;
}
export declare const createApmContextService: ({ apmSourcesAccess, }: {
    apmSourcesAccess?: ApmSourceAccessPluginStart;
}) => Promise<ApmContextService>;
