import type { CoreStart } from '@kbn/core/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
/**
 * Determines if the AI Assistant nav control selector should be visible.
 * Only visible on non-solution pages.
 *
 * @returns boolean
 */
export declare function useIsNavControlVisible(coreStart: CoreStart, spaces?: SpacesPluginStart): {
    isVisible: boolean;
};
