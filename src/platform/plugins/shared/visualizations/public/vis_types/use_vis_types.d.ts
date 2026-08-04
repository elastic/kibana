import type { BaseVisType } from './base_vis_type';
import type { TypesStart } from './types_service';
export declare function useVisTypes(visTypesRegistry: TypesStart): {
    isLoading: boolean;
    visTypes: BaseVisType<import("@kbn/visualizations-common").VisParams>[];
};
