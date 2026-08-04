import type { CoreSetup, Plugin } from '@kbn/core/public';
import React from 'react';
import type { AdvancedSettingsSetup, AdvancedSettingsStart, AdvancedSettingsPluginSetup, AdvancedSettingsPluginStart } from './types';
export declare class AdvancedSettingsPlugin implements Plugin<AdvancedSettingsSetup, AdvancedSettingsStart, AdvancedSettingsPluginSetup, AdvancedSettingsPluginStart> {
    setup(core: CoreSetup<AdvancedSettingsPluginStart>, { management, home }: AdvancedSettingsPluginSetup): {
        addSpaceSection: (Component: React.ComponentClass<import("@kbn/management-settings-section-registry").RegistryComponentProps, any> | React.FunctionComponent<import("@kbn/management-settings-section-registry").RegistryComponentProps>, queryMatch: (term: string) => boolean) => void;
        addGlobalSection: (Component: React.ComponentClass<import("@kbn/management-settings-section-registry").RegistryComponentProps, any> | React.FunctionComponent<import("@kbn/management-settings-section-registry").RegistryComponentProps>, queryMatch: (term: string) => boolean) => void;
    };
    start(): {
        getGlobalSections: () => import("@kbn/management-settings-section-registry").RegistryEntry[];
        getSpacesSections: () => import("@kbn/management-settings-section-registry").RegistryEntry[];
    };
}
