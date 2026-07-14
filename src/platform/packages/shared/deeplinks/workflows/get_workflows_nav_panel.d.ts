import { WORKFLOWS_APP_ID } from './constants';
import { type WorkflowsPageName as WorkflowsPageNameType } from './deep_links';
declare const PANEL_ID = "workflows";
type DeepLinkId = typeof WORKFLOWS_APP_ID | `${typeof WORKFLOWS_APP_ID}:${WorkflowsPageNameType}`;
/**
 * Minimal `CoreStart` shape for nav gating. Satisfied by `CoreStart` at call sites.
 *
 * Intentionally structural (no import from `@kbn/core-*`) to avoid a dependency cycle:
 * `@kbn/core-chrome-browser` already imports this package for `AppDeepLinkId` typing.
 */
export interface WorkflowsNavPanelCore {
    settings: {
        globalClient: {
            get: <T>(key: string, defaultValue: T) => T;
        };
    };
}
type WorkflowsNavNode = {
    link: typeof WORKFLOWS_APP_ID;
} | {
    id: typeof PANEL_ID;
    link: typeof WORKFLOWS_APP_ID;
    renderAs: 'panelOpener';
    children: [
        {
            breadcrumbStatus: 'hidden';
            children: [{
                link: DeepLinkId;
            }, {
                link: DeepLinkId;
            }];
        }
    ];
};
/**
 * Returns Workflows side-nav entries for solution navigation trees.
 *
 * When the Workflow Template Library tech preview is enabled, returns a panel
 * opener with list and library children. Otherwise returns a single direct link.
 *
 * ```ts
 * ...getWorkflowsNavPanel(core),
 * ```
 */
export declare const getWorkflowsNavPanel: (core: WorkflowsNavPanelCore) => WorkflowsNavNode[];
export {};
