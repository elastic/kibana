import type { ProjectRouting } from '@kbn/es-query';
import { type Observable } from 'rxjs';
import type { VisualizeServices } from '../../types';
export interface ProjectRoutingManager {
    getProjectRouting: () => ProjectRouting | undefined;
    getProjectRouting$: () => Observable<ProjectRouting | undefined>;
}
export declare function useProjectRouting(services: VisualizeServices): ProjectRoutingManager | undefined;
