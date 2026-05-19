import type { ParsedMetricItem } from '../../../../types';
export declare const useMetricFieldsFilter: ({ metricItems, searchTerm, }: {
    metricItems: ParsedMetricItem[];
    searchTerm: string;
}) => {
    filteredMetricItems: ParsedMetricItem[];
};
