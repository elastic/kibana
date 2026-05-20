import type { ApplicationStart, ChromeStart, ScopedHistory, ExecutionContextStart } from '@kbn/core/public';
import type { DocTitleService, BreadcrumbService } from './services';
import type { DevToolApp } from './dev_tool';
import type { DevToolsStartServices } from './types';
export interface AppServices {
    docTitleService: DocTitleService;
    breadcrumbService: BreadcrumbService;
    executionContext: ExecutionContextStart;
}
export declare const staticStyles: {
    devAppContainer: import("@emotion/react").SerializedStyles;
    devApp: import("@emotion/react").SerializedStyles;
    devAppTabBeta: import("@emotion/react").SerializedStyles;
};
export declare function renderApp(element: HTMLElement, application: ApplicationStart, chrome: ChromeStart, history: ScopedHistory, devTools: readonly DevToolApp[], appServices: AppServices, startServices: DevToolsStartServices): () => void;
