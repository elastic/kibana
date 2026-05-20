import type { TermsIndexPatternColumn } from '@kbn/lens-common';
type TopValuesColumnParams = Pick<TermsIndexPatternColumn['params'], 'size' | 'orderDirection' | 'orderBy' | 'secondaryFields' | 'accuracyMode' | 'orderAgg'>;
export declare const getTopValuesColumn: ({ field, options, }: {
    field: string;
    options?: Partial<TopValuesColumnParams>;
}) => TermsIndexPatternColumn;
export {};
