import { AggGroupNames } from '@kbn/data-plugin/public';
import type { ISchemas, Schema } from './types';
/** @internal **/
export declare class Schemas implements ISchemas {
    all: Schema[];
    [AggGroupNames.Buckets]: Schema[];
    [AggGroupNames.Metrics]: Schema[];
    constructor(schemas: Array<Partial<Schema>>);
}
