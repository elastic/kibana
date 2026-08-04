import type { EuiBasicTableColumn } from '@elastic/eui';
import type { SpanLinkDetails } from '@kbn/apm-types';
import type { SpanLinkType } from '.';
export declare const getColumns: ({ type, }: {
    type: SpanLinkType;
}) => Array<EuiBasicTableColumn<SpanLinkDetails>>;
