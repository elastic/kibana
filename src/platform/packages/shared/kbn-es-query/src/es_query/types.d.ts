import type { estypes } from '@elastic/elasticsearch';
/**
 * A field's sub type
 * @public
 */
export type IFieldSubType = IFieldSubTypeMultiOptional | IFieldSubTypeNestedOptional;
export type IFieldSubTypeMultiOptional = {
    multi?: {
        parent: string;
    };
};
export interface IFieldSubTypeMulti {
    multi: {
        parent: string;
    };
}
export type IFieldSubTypeNestedOptional = {
    nested?: {
        path: string;
    };
};
export interface IFieldSubTypeNested {
    nested: {
        path: string;
    };
}
/**
 * A base interface for an index pattern field
 * @public
 */
export type DataViewFieldBase = {
    name: string;
    /**
     * Kibana field type
     */
    type: string;
    subType?: IFieldSubType;
    /**
     * Scripted field painless script
     */
    script?: string;
    /**
     * Scripted field language
     * Painless is the only valid scripted field language
     */
    lang?: estypes.ScriptLanguage;
    scripted?: boolean;
    /**
     * ES field types as strings array.
     */
    esTypes?: string[];
};
/**
 * A base interface for an index pattern
 * @public
 */
export interface DataViewBase extends DataViewBaseNoFields {
    fields: DataViewFieldBase[];
}
export interface DataViewBaseNoFields {
    id?: string;
    title: string;
}
export interface BoolQuery {
    must: estypes.QueryDslQueryContainer[];
    must_not: estypes.QueryDslQueryContainer[];
    filter: estypes.QueryDslQueryContainer[];
    should: estypes.QueryDslQueryContainer[];
}
