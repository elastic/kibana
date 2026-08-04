import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { FieldRow } from './field_row';
export declare const getPinColumnControl: ({ rows, onTogglePinned, }: {
    rows: FieldRow[];
    onTogglePinned: (fieldName: string) => void;
}) => EuiDataGridControlColumn;
