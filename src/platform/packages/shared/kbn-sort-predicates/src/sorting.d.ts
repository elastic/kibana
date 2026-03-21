import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare enum NonStringSortableFieldType {
    date = "date",
    number = "number",
    range = "range",
    ip = "ip",
    version = "version"
}
export declare function getSortingCriteria(type: string | undefined, sortBy: string, formatter: FieldFormat): (rowA: Record<string, unknown> | undefined | null, rowB: Record<string, unknown> | undefined | null, direction: 'asc' | 'desc') => number;
