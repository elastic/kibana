import type { EuiBasicTableColumn } from '@elastic/eui';
import type { ErrorsByTraceId } from '@kbn/apm-types';
export declare const getColumns: ({ traceId, docId, source, }: {
    traceId: string;
    docId?: string;
    source: ErrorsByTraceId["source"];
}) => Array<EuiBasicTableColumn<ErrorsByTraceId["traceErrors"][0]>>;
