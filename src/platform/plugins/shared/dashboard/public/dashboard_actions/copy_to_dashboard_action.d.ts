import type { EmbeddableApiContext, HasParentApi, HasType, HasUniqueId, PublishesSavedObjectId } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
import type { DASHBOARD_API_TYPE } from '../dashboard_api/types';
import { type DashboardApi } from '../dashboard_api/types';
export interface DashboardCopyToCapabilities {
    canCreateNew: boolean;
    canEditExisting: boolean;
}
export type CopyToDashboardAPI = HasType & HasUniqueId & HasParentApi<{
    type: typeof DASHBOARD_API_TYPE;
} & PublishesSavedObjectId & Pick<DashboardApi, 'getDashboardPanelFromId'>>;
export declare class CopyToDashboardAction implements Action<EmbeddableApiContext> {
    readonly type = "copyToDashboard";
    readonly id = "copyToDashboard";
    order: number;
    grouping: {
        readonly id: "dashboard_actions";
        readonly order: 10;
    }[];
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getIconType({ embeddable }: EmbeddableApiContext): string;
    isCompatible({ embeddable }: EmbeddableApiContext): Promise<boolean>;
    execute({ embeddable }: EmbeddableApiContext): Promise<void>;
}
