import type { DataView } from '@kbn/data-views-plugin/public';
export declare const deepMockedFields: import("@kbn/data-views-plugin/common").IIndexPatternFieldList;
export declare const buildDataViewMock: ({ id, title, name, type, fields: definedFields, timeFieldName, isPersisted, }: {
    id?: string;
    title?: string;
    name?: string;
    type?: string;
    fields?: DataView["fields"];
    timeFieldName?: string;
    isPersisted?: boolean;
}) => DataView;
export declare const dataViewMock: DataView;
export declare const dataViewMockWithTimeField: DataView;
