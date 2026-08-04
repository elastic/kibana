/**
 * `location.state` contract of the workflows app's create page
 * (`/app/workflows/create`). Any app can hand the editor its initial content
 * by navigating with this state — no query params, no storage:
 *
 * ```ts
 * import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
 *
 * application.navigateToApp(WORKFLOWS_APP_ID, {
 *   path: '/create',
 *   state: { initialYaml } satisfies WorkflowsCreateRouteState,
 * });
 * ```
 *
 * The state travels on the history entry rather than the URL, so it survives
 * back/forward navigation but is not shareable: a plain `/create` link seeds
 * the editor with the default YAML. Used by the Workflow Template Library's
 * "Remix with AI" action to open a rendered template in the editor.
 */
export interface WorkflowsCreateRouteState {
    /** Workflow YAML to seed the editor with, in place of the default. */
    initialYaml?: string;
}
