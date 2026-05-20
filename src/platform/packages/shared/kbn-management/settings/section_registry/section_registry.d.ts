import type { ComponentType } from 'react';
import type { ToastsStart } from '@kbn/core-notifications-browser';
import type { UiSettingsScope } from '@kbn/core-ui-settings-common';
/**
 * Props provided to a `RegistryComponent`.
 */
export interface RegistryComponentProps {
    toasts: ToastsStart;
    enableSaving: Record<UiSettingsScope, boolean>;
}
/**
 * A registry entry for a section.
 */
export interface RegistryEntry {
    Component: RegistryComponent;
    queryMatch: QueryMatchFn;
}
type RegistryComponent = ComponentType<RegistryComponentProps>;
type QueryMatchFn = (term: string) => boolean;
/**
 * A registry of sections to add to pages within Advanced Settings.
 */
export declare class SectionRegistry {
    private registry;
    setup: {
        /**
         * Registers a section within the "Space" page.
         *
         * @param Component - A React component to render.
         * @param queryMatch - A function that, given a search term, returns true if the section should be rendered.
         */
        addSpaceSection: (Component: RegistryComponent, queryMatch: QueryMatchFn) => void;
        /**
         * Registers a section within the "Global" page.
         *
         * @param Component - A React component to render.
         * @param queryMatch - A function that, given a search term, returns true if the section should be rendered.
         */
        addGlobalSection: (Component: RegistryComponent, queryMatch: QueryMatchFn) => void;
    };
    start: {
        /**
         * Retrieve components registered for the "Space" page.
         */
        getGlobalSections: () => RegistryEntry[];
        /**
         * Retrieve components registered for the "Global" page.
         */
        getSpacesSections: () => RegistryEntry[];
    };
}
/**
 * The `setup` contract provided by a `SectionRegistry`.
 */
export type SectionRegistrySetup = SectionRegistry['setup'];
/**
 * The `start` contract provided by a `SectionRegistry`.
 */
export type SectionRegistryStart = SectionRegistry['start'];
export {};
