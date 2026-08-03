import React from 'react';
import type { APIReturnType } from '@kbn/apm-api-shared';
type TraceSummary = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/summary'>['summary'];
interface Props {
    summary: TraceSummary;
}
export declare function TraceSummary({ summary }: Props): React.JSX.Element;
export {};
