export declare const EMBEDDABLE_EDITOR_STATE_KEY = "embeddable_editor_state";
/**
 * A serializable breadcrumb entry passed from the originating app to editor apps.
 * Uses href instead of onClick for sessionStorage serialization.
 * @public
 */
export interface EmbeddableEditorBreadcrumb {
    text: string;
    href: string;
}
/**
 * A state package that contains information an editor will need to create or edit an embeddable then redirect back.
 * @public
 */
export interface EmbeddableEditorState {
    originatingApp: string;
    originatingPath?: string;
    /**
     * Breadcrumbs from the originating app context (e.g. [Dashboards, Visualizations]).
     * Consumers prepend these to their own breadcrumbs. Computed by the originating app
     * using getUrlForApp.
     */
    breadcrumbs?: EmbeddableEditorBreadcrumb[];
    embeddableId?: string;
    valueInput?: object;
    /**
     * Pass current search session id when navigating to an editor,
     * Editors could use it continue previous search session
     */
    searchSessionId?: string;
}
export declare function isEmbeddableEditorState(state: unknown): state is EmbeddableEditorState;
export declare const EMBEDDABLE_PACKAGE_STATE_KEY = "embeddable_package_state";
/**
 * A state package that contains all fields necessary to create or update an embeddable by reference or by value in a container.
 * @public
 */
export interface EmbeddablePackageState<SerializedState extends object = object> {
    type: string;
    serializedState: SerializedState;
    embeddableId?: string;
    size?: {
        width?: number;
        height?: number;
    };
    /**
     * Pass current search session id when navigating to an editor,
     * Editors could use it continue previous search session
     */
    searchSessionId?: string;
}
export declare function isEmbeddablePackageState(state: unknown): state is EmbeddablePackageState;
