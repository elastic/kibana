import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core/public';
/** Fired once per page load with the current customized-vs-default state. */
export declare const NAV_LOADED_EVENT_TYPE = "navigation_loaded";
/** Fired when the user persists a layout from the "Customize navigation" modal. */
export declare const NAV_CUSTOMIZATION_EVENT_TYPE = "navigation_customization";
export type NavCustomizationAction = 'customization_saved' | 'default_saved';
export interface NavLoadedEventProps {
    /**
     * Whether a non-default customization is currently stored for this user/space.
     * Deduped at query time by the platform-provided `context.userId`, so no per-user write
     * is needed to derive an adoption denominator/numerator from this event.
     */
    nav_customize_state: boolean;
}
export interface NavCustomizationEventProps {
    action: NavCustomizationAction;
    did_customize: boolean;
    /** Visible nav item IDs in display order (array index = position). */
    visible_item_ids: string[];
    /** Hidden nav item IDs (under the "More" menu), in their original order. */
    hidden_item_ids: string[];
}
/**
 * Builds the nav-item ID arrays expected by the save event.
 */
export declare function buildNavItemsProperties(itemsInOrder: Array<{
    id: string;
    hidden: boolean;
}>): Pick<NavCustomizationEventProps, 'visible_item_ids' | 'hidden_item_ids'>;
export declare function registerNavigationCustomizationEvents(analytics: AnalyticsServiceSetup): void;
export declare function reportNavigationLoaded(analytics: AnalyticsServiceStart, props: NavLoadedEventProps): void;
export declare function reportNavigationCustomization(analytics: AnalyticsServiceStart, props: NavCustomizationEventProps): void;
