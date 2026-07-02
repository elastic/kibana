import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
import type { DashboardSearchRequestParams } from '../../server';
interface Context {
    onResults: (dashboards: Array<{
        id: string;
        isManaged: boolean;
        title: string;
    }>) => void;
    search: DashboardSearchRequestParams;
}
export declare const searchAction: ActionDefinition<Context>;
export {};
