import type { Filter, PhrasesFilter } from '@kbn/es-query';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
export declare function getPhrasesDisplayValue(filter: PhrasesFilter, formatter?: FieldFormat): string;
export declare const mapPhrases: (filter: Filter) => {
    type: string | undefined;
    key: string | undefined;
    value: (import("@kbn/es-query/src/filters/build_filters").FilterMetaParams | undefined) & import("@kbn/es-query/src/filters/build_filters").PhraseFilterValue[];
    params: (import("@kbn/es-query/src/filters/build_filters").FilterMetaParams | undefined) & import("@kbn/es-query/src/filters/build_filters").PhraseFilterValue[];
};
