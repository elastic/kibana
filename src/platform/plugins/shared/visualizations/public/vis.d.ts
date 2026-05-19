import type { Assign } from '@kbn/utility-types';
import type { IAggConfigs, ISearchSource } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import type { VisParams } from '@kbn/visualizations-common';
import { PersistedState } from './persisted_state';
import type { BaseVisType } from './vis_types';
import type { SerializedVis, SerializedVisData } from '../common/types';
export type { SerializedVis, SerializedVisData };
export interface VisData {
    ast?: string;
    aggs?: IAggConfigs;
    indexPattern?: DataView;
    searchSource?: ISearchSource;
    savedSearchId?: string;
}
type PartialVisState = Assign<SerializedVis, {
    data: Partial<SerializedVisData>;
}>;
export declare class Vis<TVisParams extends VisParams = VisParams> {
    readonly type: BaseVisType<TVisParams>;
    readonly id?: string;
    title: string;
    description: string;
    params: TVisParams;
    data: VisData;
    readonly uiState: PersistedState;
    constructor(visType: string, visState?: SerializedVis<TVisParams>);
    private getType;
    private getParams;
    setState(inState: PartialVisState): Promise<void>;
    clone(): Vis<TVisParams>;
    serialize(): SerializedVis;
    isHierarchical(): boolean;
    private initializeDefaultsFromSchemas;
}
export default Vis;
