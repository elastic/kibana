import moment from 'moment';
import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';
export interface TelemetryResponse {
    installed: string[];
    uninstalled: string[];
    last_install_date: moment.Moment | null;
    last_install_set: string | null;
    last_uninstall_date: moment.Moment | null;
    last_uninstall_set: string | null;
}
export declare function fetchProvider(getIndexForType: (type: string) => Promise<string>): ({ esClient }: CollectorFetchContext) => Promise<any>;
