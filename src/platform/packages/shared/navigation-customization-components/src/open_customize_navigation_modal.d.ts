import React from 'react';
import type { NavigationCustomization } from '@kbn/core-chrome-browser';
import type { NavigationItemInfo } from './types';
export interface OpenCustomizeNavigationModalDeps {
    items: NavigationItemInfo[];
    defaultItemIds: string[];
    /**
     * Injected by the caller (navigation plugin) to avoid importing
     * `@kbn/core-chrome-navigation-customization` from this shared package — the
     * caller lazy-loads it alongside this module.
     */
    computeMoves: (defaultOrder: readonly string[], userOrder: readonly string[]) => NavigationCustomization['moves'];
    onChange: (customization: NavigationCustomization) => void;
    onSave: (customization: NavigationCustomization, order: string[], hiddenIds: string[]) => void;
    onReset: () => Promise<NavigationItemInfo[]>;
    onClose: () => void;
    /**
     * Caller-supplied mount function that handles `toMountPoint`,
     * `core.rendering.addContext`, and `core.overlays.openModal`.
     * Called synchronously so the caller can capture the overlay ref for closing.
     */
    mountModal: (element: React.ReactElement) => void;
}
/**
 * Assembles the `CustomizeNavigationModal` element and mounts it via the
 * caller-supplied `mountModal`. All chrome / core / userStorage interactions
 * are expressed as plain callbacks so this function has no platform imports.
 */
export declare const openCustomizeNavigationModal: ({ items, defaultItemIds, computeMoves, onChange, onSave, onReset, onClose, mountModal, }: OpenCustomizeNavigationModalDeps) => void;
