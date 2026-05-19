import type { VisParams } from '../types';
import type { VisTypeDefinition, VisTypeOptions } from './types';
import { VisGroups } from './vis_groups_enum';
import { Schemas } from './schemas';
export declare class BaseVisType<TVisParams extends VisParams = VisParams> {
    readonly name: string;
    readonly title: string;
    readonly order: number;
    readonly description: string;
    readonly note: string;
    readonly getSupportedTriggers: ((params?: VisParams) => string[]) | undefined;
    readonly navigateToLens: ((vis?: import("../vis").Vis<TVisParams> | undefined, timeFilter?: import("../../../data/public").TimefilterContract) => Promise<import("@kbn/lens-common").NavigateToLensContext | null> | undefined) | undefined;
    readonly getExpressionVariables: ((vis?: import("../vis").Vis<TVisParams> | undefined, timeFilter?: import("../../../data/public").TimefilterContract) => Promise<Record<string, unknown>>) | undefined;
    readonly icon: import("@elastic/eui/src/components/icon/icon").IconType | undefined;
    readonly image: string | undefined;
    readonly stage: "production" | "experimental" | "beta";
    readonly isDeprecated: boolean;
    readonly group: VisGroups;
    readonly titleInWizard: string;
    readonly options: VisTypeOptions;
    readonly visConfig: any;
    readonly editorConfig: any;
    readonly disableCreate: boolean;
    readonly disableEdit: boolean;
    readonly requiresSearch: boolean;
    readonly hasPartialRows: boolean | ((vis: {
        params: TVisParams;
    }) => boolean);
    readonly hierarchicalData: boolean | ((vis: {
        params: TVisParams;
    }) => boolean);
    readonly setup: ((vis: import("../vis").Vis<TVisParams>) => Promise<import("../vis").Vis<TVisParams>>) | undefined;
    readonly getUsedIndexPattern: ((visParams: VisParams) => import("@kbn/kql/server/data_views").DataView[] | Promise<import("@kbn/kql/server/data_views").DataView[]>) | undefined;
    readonly getProjectRoutingOverrides: ((visParams: VisParams) => Promise<Array<{
        name?: string;
        value: string;
    }> | undefined>) | undefined;
    readonly inspectorAdapters: import("../../../inspector/common").Adapters | (() => import("../../../inspector/common").Adapters) | undefined;
    readonly fetchDatatable: boolean;
    readonly toExpressionAst: import("../types").VisToExpressionAst<TVisParams>;
    readonly getInfoMessage: ((vis: import("../vis").Vis) => React.ReactNode) | undefined;
    readonly updateVisTypeOnParamsChange: ((params: VisParams) => string | undefined) | undefined;
    readonly schemas: Schemas;
    constructor(opts: VisTypeDefinition<TVisParams>);
}
