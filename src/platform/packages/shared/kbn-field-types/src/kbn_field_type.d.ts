import type { KbnFieldTypeOptions, ES_FIELD_TYPES } from './types';
export declare class KbnFieldType {
    readonly name: string;
    readonly sortable: boolean;
    readonly filterable: boolean;
    readonly esTypes: readonly ES_FIELD_TYPES[];
    constructor(options?: Partial<KbnFieldTypeOptions>);
}
