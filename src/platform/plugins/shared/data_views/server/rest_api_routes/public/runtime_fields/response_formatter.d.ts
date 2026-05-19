import type { DataViewField, DataViewLazy } from '../../../../common';
import type { SERVICE_KEY_TYPE } from '../../../constants';
interface ResponseFormatterArgs {
    serviceKey: SERVICE_KEY_TYPE;
    fields: DataViewField[];
    dataView: DataViewLazy;
}
export declare const responseFormatter: ({ serviceKey, fields, dataView, }: ResponseFormatterArgs) => Promise<{
    body: {
        index_pattern: {
            id?: string;
            version?: string;
            title?: string;
            timeFieldName?: string;
            sourceFilters?: import("../../../../common").SourceFilter[];
            fields?: import("../../../../common").DataViewFieldMap;
            typeMeta?: import("../../../../common").TypeMeta;
            type?: string;
            fieldFormats?: Record<string, import("../../../../../field_formats/common").SerializedFieldFormat>;
            runtimeFieldMap?: Record<string, import("../../../../common").RuntimeFieldSpec>;
            fieldAttrs?: import("../../../../common/types").FieldAttrsAsObject;
            allowNoIndex?: boolean;
            namespaces?: string[];
            name?: string;
            allowHidden?: boolean;
        };
        field: import("../../../../common").FieldSpec;
    };
} | {
    body: {
        fields: import("../../../../common").FieldSpec[];
        data_view: {
            id?: string;
            version?: string;
            title?: string;
            timeFieldName?: string;
            sourceFilters?: import("../../../../common").SourceFilter[];
            fields?: import("../../../../common").DataViewFieldMap;
            typeMeta?: import("../../../../common").TypeMeta;
            type?: string;
            fieldFormats?: Record<string, import("../../../../../field_formats/common").SerializedFieldFormat>;
            runtimeFieldMap?: Record<string, import("../../../../common").RuntimeFieldSpec>;
            fieldAttrs?: import("../../../../common/types").FieldAttrsAsObject;
            allowNoIndex?: boolean;
            namespaces?: string[];
            name?: string;
            allowHidden?: boolean;
        };
    };
}>;
export {};
