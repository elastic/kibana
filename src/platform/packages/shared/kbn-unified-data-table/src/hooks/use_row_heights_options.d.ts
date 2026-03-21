import type { EuiDataGridRowHeightsOptions } from '@elastic/eui';
interface UseRowHeightProps {
    rowHeightLines: number;
    rowLineHeight?: string;
}
export declare const useRowHeightsOptions: ({ rowHeightLines, rowLineHeight, }: UseRowHeightProps) => EuiDataGridRowHeightsOptions;
export {};
