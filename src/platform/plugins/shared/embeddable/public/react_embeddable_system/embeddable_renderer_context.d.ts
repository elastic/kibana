import type { ViewMode } from '@kbn/presentation-publishing';
export declare const EmbeddableRendererContext: import("react").Context<{
    quickActions?: QuickActions;
} | undefined>;
export type QuickActionIds = [
    string?,
    string?,
    string?,
    string?,
    string?,
    string?,
    string?,
    string?
];
type QuickActionViewMode = Extract<ViewMode, 'view' | 'edit'>;
/**
 * Limited sets of action ids that will be promoted to quick actions on the panel header that appear on hover.
 * Actions in this list only appear if they are deemed compatible. Use EmbeddableRendererContext to customize.
 */
export type QuickActions = {
    [key in QuickActionViewMode]?: QuickActionIds;
};
export declare const DEFAULT_QUICK_ACTIONS: QuickActions;
export {};
