import type { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import type { SavedObjectsManagementRecord } from '.';
interface ColumnContext {
    capabilities: Capabilities;
}
export declare abstract class SavedObjectsManagementColumn {
    abstract id: string;
    abstract euiColumn: Omit<EuiTableFieldDataColumnType<SavedObjectsManagementRecord>, 'sortable'>;
    refreshOnFinish?: () => Array<{
        type: string;
        id: string;
    }>;
    private callbacks;
    protected columnContext: ColumnContext | null;
    setColumnContext(columnContext: ColumnContext): void;
    registerOnFinishCallback(callback: Function): void;
    protected finish(): void;
}
export {};
