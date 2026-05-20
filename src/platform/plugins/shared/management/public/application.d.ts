import type { AppMountParameters } from '@kbn/core/public';
import type { ManagementAppDependencies } from './components/management_app';
export declare const renderApp: ({ history, appBasePath, element, theme$ }: AppMountParameters, dependencies: ManagementAppDependencies) => Promise<() => boolean>;
