import type { ReactNode } from 'react';
import type { Capabilities } from '@kbn/core/public';
import type { SavedObjectsManagementRecord } from '.';
interface ActionContext {
    capabilities: Capabilities;
}
export declare abstract class SavedObjectsManagementAction {
    abstract render: () => ReactNode;
    abstract id: string;
    abstract euiAction: {
        name: string;
        description: string;
        icon: string;
        type: string;
        available?: (item: SavedObjectsManagementRecord) => boolean;
        enabled?: (item: SavedObjectsManagementRecord) => boolean;
        onClick?: (item: SavedObjectsManagementRecord) => void;
        render?: (item: SavedObjectsManagementRecord) => any;
    };
    refreshOnFinish?: () => Array<{
        type: string;
        id: string;
    }>;
    private callbacks;
    protected actionContext: ActionContext | null;
    protected record: SavedObjectsManagementRecord | null;
    setActionContext(actionContext: ActionContext): void;
    registerOnFinishCallback(callback: Function): void;
    protected start(record: SavedObjectsManagementRecord): void;
    protected finish(): void;
}
export {};
