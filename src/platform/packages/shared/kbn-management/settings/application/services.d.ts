import type { FC, PropsWithChildren } from 'react';
import { type FormKibanaDependencies, type FormServices } from '@kbn/management-settings-components-form';
import type { SettingsCapabilities, UiSettingMetadata } from '@kbn/management-settings-types';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { Subscription } from 'rxjs';
import type { ApplicationStart, ScopedHistory } from '@kbn/core-application-browser';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
import type { RegistryEntry, SectionRegistryStart } from '@kbn/management-settings-section-registry';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { ChromeBadge, ChromeStart } from '@kbn/core-chrome-browser';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { Space } from '@kbn/spaces-plugin/common';
import type { SolutionView } from '@kbn/spaces-plugin/common';
export interface Services {
    getAllowlistedSettings: (scope: UiSettingsScope, solution: SolutionView | undefined) => Record<string, UiSettingMetadata>;
    getSections: (scope: UiSettingsScope) => RegistryEntry[];
    getToastsService: () => ToastsStart;
    getCapabilities: () => SettingsCapabilities;
    setBadge: (badge: ChromeBadge) => void;
    subscribeToUpdates: (fn: () => void, scope: UiSettingsScope) => Subscription;
    isCustomSetting: (key: string, scope: UiSettingsScope) => boolean;
    isOverriddenSetting: (key: string, scope: UiSettingsScope) => boolean;
    addUrlToHistory: (url: string) => void;
    getActiveSpace: () => Promise<Pick<Space, 'solution'>>;
    subscribeToActiveSpace: (fn: () => void) => Subscription;
}
export type SettingsApplicationServices = Services & FormServices;
export interface KibanaDependencies {
    settings: {
        client: Pick<IUiSettingsClient, 'getAll' | 'isCustom' | 'isOverridden' | 'getUpdate$' | 'validateValue'>;
        globalClient: Pick<IUiSettingsClient, 'getAll' | 'isCustom' | 'isOverridden' | 'getUpdate$' | 'validateValue'>;
    };
    history: ScopedHistory;
    sectionRegistry: SectionRegistryStart;
    notifications: {
        toasts: ToastsStart;
    };
    application: Pick<ApplicationStart, 'capabilities'>;
    chrome: Pick<ChromeStart, 'setBadge'>;
    spaces: Pick<SpacesPluginStart, 'getActiveSpace' | 'getActiveSpace$'>;
}
export type SettingsApplicationKibanaDependencies = KibanaDependencies & FormKibanaDependencies;
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const SettingsApplicationProvider: FC<PropsWithChildren<SettingsApplicationServices>>;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const SettingsApplicationKibanaProvider: FC<PropsWithChildren<SettingsApplicationKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare const useServices: () => Services;
