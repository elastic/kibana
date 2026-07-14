import type { IBasePath } from '@kbn/core-http-browser';
import type { AppMountParameters } from '@kbn/core-application-browser';
interface Deps {
    basePath: IBasePath;
}
/**
 * Renders UI for displaying error messages.
 * @internal
 */
export declare const renderApp: ({ element, history, theme$ }: AppMountParameters, { basePath }: Deps) => () => void;
export {};
