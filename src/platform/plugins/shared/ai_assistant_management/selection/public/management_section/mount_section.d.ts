import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { BuildFlavor } from '@kbn/config';
import type { StartDependencies, AIAssistantManagementSelectionPluginPublicStart } from '../plugin';
interface MountParams {
    core: CoreSetup<StartDependencies, AIAssistantManagementSelectionPluginPublicStart>;
    mountParams: ManagementAppMountParams;
    kibanaBranch: string;
    buildFlavor: BuildFlavor;
    securityAIAssistantEnabled: boolean;
}
export declare const mountManagementSection: ({ core, mountParams, kibanaBranch, buildFlavor, securityAIAssistantEnabled, }: MountParams) => Promise<() => void>;
export {};
