import type { FC, PropsWithChildren, ReactNode } from 'react';
import React from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import type { OverlaySystemFlyoutOpenOptions } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
type NotifyFn = (title: JSX.Element, text?: string) => void;
export type TagSelectorProps = EuiComboBoxProps<unknown> & {
    initialSelection: string[];
    onTagsSelected: (ids: string[]) => void;
};
export interface SavedObjectsReference {
    id: string;
    name: string;
    type: string;
}
export interface Theme {
    readonly darkMode: boolean;
}
/**
 * Abstract external services for this component.
 */
export interface Services {
    openSystemFlyout(node: ReactNode, options?: OverlaySystemFlyoutOpenOptions): OverlayRef;
    notifyError: NotifyFn;
    TagList?: FC<{
        tagIds: string[];
    }>;
    TagSelector?: React.FC<TagSelectorProps>;
}
/**
 * Abstract external service Provider.
 */
export declare const ContentEditorProvider: FC<PropsWithChildren<Services>>;
/**
 * Specific services for mounting React
 */
interface ContentEditorStartServices {
    analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
    i18n: I18nStart;
    theme: Pick<ThemeServiceStart, 'theme$'>;
    userProfile: UserProfileService;
}
/**
 * Kibana-specific service types.
 */
export interface ContentEditorKibanaDependencies {
    /** CoreStart contract */
    core: ContentEditorStartServices & {
        overlays: {
            openSystemFlyout(content: React.ReactElement, options?: OverlaySystemFlyoutOpenOptions): OverlayRef;
        };
        notifications: {
            toasts: {
                addDanger: (notifyArgs: {
                    title: MountPoint;
                    text?: string;
                }) => void;
            };
        };
        rendering: {
            addContext: (element: React.ReactNode) => React.ReactElement;
        };
    };
    /**
     * The public API from the savedObjectsTaggingOss plugin.
     * It is returned by calling `getTaggingApi()` from the SavedObjectTaggingOssPluginStart
     *
     * ```js
     * const savedObjectsTagging = savedObjectsTaggingOss?.getTaggingApi()
     * ```
     */
    savedObjectsTagging?: {
        ui: {
            components: {
                TagList: React.FC<{
                    object: {
                        references: SavedObjectsReference[];
                    };
                    onClick?: (tag: {
                        name: string;
                        description: string;
                        color: string;
                        managed: boolean;
                    }) => void;
                }>;
                SavedObjectSaveModalTagSelector: React.FC<TagSelectorProps>;
            };
        };
    };
}
/**
 * Kibana-specific Provider that maps to known dependency types.
 *
 * Self-provides every external context the editor needs so consumers can drop
 * it into any provider tree without thinking about ancestry:
 *
 * - {@link QueryClientProvider} — the inner body uses `useQueryClient()` to
 *   forward the client into the system flyout it opens, so user-profile
 *   queries inside the flyout work without an outer `QueryClientProvider`.
 * - {@link UserProfilesKibanaProvider} — the inner body reads profile services
 *   via `useUserProfilesServices()` for the same forwarding reason.
 *
 * When this provider is itself rendered under another `QueryClientProvider`
 * or `UserProfilesProvider` (e.g. legacy `TableListViewKibanaProvider`), the
 * inner providers shadow the outer with semantically equivalent values derived
 * from the same `core` services, so nesting is harmless.
 */
export declare const ContentEditorKibanaProvider: FC<PropsWithChildren<ContentEditorKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
export {};
