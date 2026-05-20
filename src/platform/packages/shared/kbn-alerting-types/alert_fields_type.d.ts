import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { IFieldSubType } from '@kbn/es-query';
import type { RuntimeField } from '@kbn/data-views-plugin/common';
export interface BrowserField {
    aggregatable: boolean;
    category: string;
    description?: string | null;
    example?: string | number | null;
    fields: Readonly<Record<string, Partial<BrowserField>>>;
    format?: SerializedFieldFormat;
    indexes: string[];
    name: string;
    searchable: boolean;
    type: string;
    subType?: IFieldSubType;
    readFromDocValues: boolean;
    runtimeField?: RuntimeField;
}
export type BrowserFields = Record<string, Partial<BrowserField>>;
