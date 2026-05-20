import React from 'react';
export interface SimilarErrorsOccurrencesChartProps {
    baseEsqlQuery: ReturnType<typeof import('../get_esql_query').getEsqlQuery>;
    currentDocumentTimestamp?: string;
}
export declare function SimilarErrorsOccurrencesChart({ baseEsqlQuery, currentDocumentTimestamp, }: SimilarErrorsOccurrencesChartProps): React.JSX.Element;
