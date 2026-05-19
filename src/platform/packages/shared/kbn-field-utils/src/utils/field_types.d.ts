import { type FieldTypeKnown } from '../types';
/**
 * Field types for which name and description are defined
 * @public
 */
export declare enum KNOWN_FIELD_TYPES {
    DOCUMENT = "document",// "Records" on Lens page
    BINARY = "binary",
    BOOLEAN = "boolean",
    CONFLICT = "conflict",
    COUNTER = "counter",
    DATE = "date",
    DATE_RANGE = "date_range",
    DENSE_VECTOR = "dense_vector",
    GAUGE = "gauge",
    GEO_POINT = "geo_point",
    GEO_SHAPE = "geo_shape",
    HISTOGRAM = "histogram",
    EXPONENTIAL_HISTOGRAM = "exponential_histogram",
    TDIGEST = "tdigest",
    IP = "ip",
    IP_RANGE = "ip_range",
    FLATTENED = "flattened",
    KEYWORD = "keyword",
    MURMUR3 = "murmur3",
    NUMBER = "number",
    NESTED = "nested",
    RANK_FEATURE = "rank_feature",
    RANK_FEATURES = "rank_features",
    POINT = "point",
    SHAPE = "shape",
    SPARSE_VECTOR = "sparse_vector",
    SEMANTIC_TEXT = "semantic_text",
    STRING = "string",
    TEXT = "text",
    VERSION = "version",
    NULL = "null"
}
export declare const KNOWN_FIELD_TYPE_LIST: string[];
export declare const isKnownFieldType: (type?: string) => type is FieldTypeKnown;
