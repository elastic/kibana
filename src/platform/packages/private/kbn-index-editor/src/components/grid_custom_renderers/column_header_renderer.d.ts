import { type EuiDataGridColumn } from '@elastic/eui';
import type { CustomGridColumnProps } from '@kbn/unified-data-table';
import type { IndexUpdateService } from '../../services/index_update_service';
import type { IndexEditorTelemetryService } from '../../telemetry/telemetry_service';
export declare const getColumnHeaderRenderer: (columnName: string, columnType: string | undefined, columnIndex: number, isSavedColumn: boolean, isUnsupportedESQLType: boolean, isColumnInEditMode: boolean, setEditingColumnIndex: (columnIndex: number | null) => void, indexUpdateService: IndexUpdateService, telemetryService: IndexEditorTelemetryService) => ((props: CustomGridColumnProps) => EuiDataGridColumn);
