import type { DataViewSpec } from '../../../../common';
/**
 * Converts a data view spec to an API compatible spec, removing unexposed properties
 * @param dataViewSpec - The data view spec to convert to an API compatible spec
 * @returns The API compatible data view spec
 */
export declare const toApiSpec: (dataViewSpec: DataViewSpec) => {
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
