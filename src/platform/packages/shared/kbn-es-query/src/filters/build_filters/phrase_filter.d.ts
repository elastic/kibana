import type { estypes } from '@elastic/elasticsearch';
import type { SerializableRecord } from '@kbn/utility-types';
import type { Filter, FilterMeta } from './types';
import type { DataViewFieldBase, DataViewBaseNoFields } from '../../es_query';
export type PhraseFilterValue = string | number | boolean;
export interface PhraseFilterMetaParams extends SerializableRecord {
    query: PhraseFilterValue;
}
export type PhraseFilterMeta = FilterMeta & {
    params?: PhraseFilterMetaParams;
    field?: string;
    index?: string;
};
export type PhraseFilter = Filter & {
    meta: PhraseFilterMeta;
    query: {
        match_phrase?: NonNullable<estypes.QueryDslQueryContainer>['match_phrase'];
        match?: NonNullable<estypes.QueryDslQueryContainer>['match'];
    };
};
export type ScriptedPhraseFilter = Filter & {
    meta: PhraseFilterMeta;
    query: {
        script: {
            script: estypes.Script;
        };
    };
};
/**
 * @param filter
 * @returns `true` if a filter is a `PhraseFilter`
 *
 * @public
 */
export declare const isPhraseFilter: (filter: Filter) => filter is PhraseFilter;
/**
 * @param filter
 * @returns `true` if a filter is a scripted `PhrasesFilter`
 *
 * @public
 */
export declare const isScriptedPhraseFilter: (filter: Filter) => filter is ScriptedPhraseFilter;
/** @internal */
export declare const getPhraseFilterField: (filter: PhraseFilter | ScriptedPhraseFilter) => string;
/**
 * @internal
 */
export declare const getPhraseFilterValue: (filter: PhraseFilter | ScriptedPhraseFilter) => PhraseFilterValue;
/**
 * Creates a filter where the given field matches a given value
 * @param field
 * @param params
 * @param indexPattern
 * @returns `PhraseFilter`
 *
 * @public
 */
export declare const buildPhraseFilter: (field: DataViewFieldBase, value: PhraseFilterValue, indexPattern: DataViewBaseNoFields) => PhraseFilter | ScriptedPhraseFilter;
/** @internal */
export declare const getPhraseScript: (field: DataViewFieldBase, value: PhraseFilterValue) => {
    script: estypes.Script;
};
/**
 * @internal
 * Takes a scripted field and returns an inline script appropriate for use in a script query.
 * Handles lucene expression and Painless scripts. Other langs aren't guaranteed to generate valid
 * scripts.
 *
 * @param {object} scriptedField A Field object representing a scripted field
 * @returns {string} The inline script string
 */
export declare const buildInlineScriptForPhraseFilter: (scriptedField: DataViewFieldBase) => string;
