import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { StartDependencies, SavedObjectsManagementPluginStart } from '../plugin';
import type { SavedObjectsManagementActionServiceStart, SavedObjectsManagementColumnServiceStart } from '../services';
interface MountParams {
    core: CoreSetup<StartDependencies, SavedObjectsManagementPluginStart>;
    mountParams: ManagementAppMountParams;
    getActionServiceStart: () => SavedObjectsManagementActionServiceStart;
    getColumnServiceStart: () => SavedObjectsManagementColumnServiceStart;
}
export declare const mountManagementSection: ({ core, mountParams, getColumnServiceStart, getActionServiceStart, }: MountParams) => Promise<() => void>;
export {};
