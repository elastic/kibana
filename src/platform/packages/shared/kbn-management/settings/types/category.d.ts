import type { FieldDefinition } from './field_definition';
export interface CategorizedFields {
    [category: string]: {
        count: number;
        fields: FieldDefinition[];
    };
}
export interface CategoryCounts {
    [category: string]: number;
}
