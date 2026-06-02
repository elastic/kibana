import { KbnError } from '@kbn/kibana-utils-plugin/common';
/**
 * Tried to call a method that relies on SearchSource having an indexPattern assigned
 */
export declare class DataViewMissingIndices extends KbnError {
    constructor(message: string);
}
