import type { Observable } from 'rxjs';
import type { PluginName } from '@kbn/core-base-common';
import { type Deps, PluginsStatusService as BasePluginsStatusService } from './plugins_status';
import type { PluginStatus } from './types';
export declare class PluginsStatusService extends BasePluginsStatusService {
    private all$?;
    private dependenciesStatuses$;
    private derivedStatuses$;
    constructor(deps: Deps);
    getAll$(): Observable<Record<PluginName, PluginStatus>>;
    getDependenciesStatus$(plugin: PluginName): Observable<Record<PluginName, PluginStatus>>;
    getDerivedStatus$(plugin: PluginName): Observable<PluginStatus>;
}
