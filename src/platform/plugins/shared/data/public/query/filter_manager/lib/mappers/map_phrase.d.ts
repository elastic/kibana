import type { Filter, PhraseFilter, ScriptedPhraseFilter } from '@kbn/es-query';
import { FILTERS } from '@kbn/es-query';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function getPhraseDisplayValue(filter: PhraseFilter | ScriptedPhraseFilter, formatter?: FieldFormat, fieldType?: string): string;
export declare const isMapPhraseFilter: (filter: any) => filter is PhraseFilter;
export declare const mapPhrase: (filter: Filter) => {
    key: string;
    params: {
        query: any;
    };
    type: FILTERS;
};
