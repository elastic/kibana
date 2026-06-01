import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { IManagementSectionsPluginsSetup, IManagementSectionsPluginsStart } from '..';
import { renderApp } from './render';
import type { SearchSessionsConfigSchema } from '../../../../../server/config';
export declare class SearchSessionsMgmtApp {
    private coreSetup;
    private setupDeps;
    private config;
    private kibanaVersion;
    private params;
    constructor(coreSetup: CoreSetup<IManagementSectionsPluginsStart>, setupDeps: IManagementSectionsPluginsSetup, config: SearchSessionsConfigSchema, kibanaVersion: string, params: ManagementAppMountParams);
    mountManagementSection(): Promise<() => void>;
}
export { renderApp };
