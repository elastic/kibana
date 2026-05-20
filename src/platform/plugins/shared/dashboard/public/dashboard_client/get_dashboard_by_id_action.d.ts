import type { ActionDefinition } from '@kbn/ui-actions-plugin/public/actions';
interface Context {
    onResults: (dashboards: Array<{
        id: string;
        isManaged: boolean;
        title: string;
    }>) => void;
    ids: string[];
}
export declare const getDashboardsByIdsAction: ActionDefinition<Context>;
export {};
