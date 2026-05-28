import type { ApplicationStart, IBasePath } from '@kbn/core/public';
import type { ForwardDefinition } from '..';
export declare const navigateToLegacyKibanaUrl: (path: string, forwards: ForwardDefinition[], basePath: IBasePath, application: ApplicationStart) => {
    navigated: boolean;
};
