import type { VisParams } from '@kbn/visualizations-common';
import type { Vis, VisToExpressionAstParams } from './types';
import type { SchemaConfig } from '../common/types';
export interface Schemas {
    metric: SchemaConfig[];
    bucket?: SchemaConfig[];
    geo_centroid?: any[];
    group?: any[];
    params?: any[];
    radius?: any[];
    segment?: any[];
    split_column?: SchemaConfig[];
    split_row?: SchemaConfig[];
    width?: any[];
    [key: string]: any[] | undefined;
}
export declare const getVisSchemas: <TVisParams extends VisParams>(vis: Vis<TVisParams>, params: VisToExpressionAstParams) => Schemas;
