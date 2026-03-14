/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';

import type {
  NavigationCustomization,
  NavigationTreeDefinition,
  NavigationItemInfo,
  SolutionId,
  SolutionNavigationCustomizations,
  NavigationTreeDefinitionUI,
} from '@kbn/core-chrome-browser';
import { LOCKED_ITEM_IDS } from '@kbn/core-chrome-navigation';

/**
 * Service responsible for handling navigation customization logic.
 * Manages user customizations like reordering and hiding navigation items,
 * including persistence to localStorage.
 */
export class ProjectNavigationCustomizationService {
  private static readonly CUSTOM_NAV_STORAGE_KEY = 'kibana.solutionNavigationCustomization';

  private readonly solutionNavigationCustomizations$ =
    new BehaviorSubject<SolutionNavigationCustomizations>({});
  private readonly isEditing$ = new BehaviorSubject<boolean>(false);

  constructor() {
    this.initCustomNavigationFromStorage();
  }

  /**
   * Get the observable for navigation customizations.
   */
  public getCustomizations$() {
    return this.solutionNavigationCustomizations$.asObservable();
  }

  /**
   * Get the observable for whether navigation is being edited.
   */
  public getIsEditing$() {
    return this.isEditing$.asObservable();
  }

  /**
   * Returns a simplified list of primary navigation items for the editor modal.
   * Only includes id, title, hidden status (from user customization), and locked status.
   */
  public getNavigationPrimaryItems(tree: NavigationTreeDefinitionUI | null): NavigationItemInfo[] {
    if (!tree) return [];

    return tree.body
      .filter((node) => node.renderAs !== 'home') // Exclude the solution home/logo item
      .map((node) => ({
        id: node.id,
        title: node.title || node.id,
        hidden: node.sideNavStatus === 'hiddenByUser',
        locked: LOCKED_ITEM_IDS.has(node.id),
      }));
  }

  /**
   * Set customization for a specific solution navigation.
   */
  public setNavigationCustomization(
    id: SolutionId,
    customization: NavigationCustomization | undefined
  ) {
    const current = this.solutionNavigationCustomizations$.getValue();

    if (customization === undefined) {
      const { [id]: _, ...rest } = current;
      this.solutionNavigationCustomizations$.next(rest);
    } else {
      this.solutionNavigationCustomizations$.next({ ...current, [id]: customization });
    }

    // Don't persist while in edit mode
    if (!this.isEditing$.getValue()) {
      this.persistNavigationCustomizations();
    }
  }

  /**
   * Set whether navigation is being edited.
   * When exiting edit mode, restores from storage (discards unpersisted changes).
   */
  public setIsEditingNavigation(isEditing: boolean) {
    this.isEditing$.next(isEditing);

    // When exiting edit mode, restore from storage (discard unpersisted changes)
    if (!isEditing) {
      this.initCustomNavigationFromStorage();
    }
  }

  /**
   * Apply customization configuration to a navigation tree.
   * Reorders top-level items and marks hidden items with sideNavStatus: 'hiddenByUser'.
   * Locked items (from definition or defaults) are kept at the top and cannot be hidden.
   */
  public applyCustomization(
    tree: NavigationTreeDefinition,
    customization: NavigationCustomization | undefined
  ): NavigationTreeDefinition {
    if (!customization) return tree;

    const { order, hiddenIds } = customization;

    const getItemId = (item: (typeof tree.body)[number]): string | undefined =>
      item.id ?? item.link;

    const isLocked = (item: (typeof tree.body)[number]): boolean => {
      const itemId = getItemId(item);
      return itemId !== undefined && LOCKED_ITEM_IDS.has(itemId);
    };

    // Filter out locked items from hidden set - they cannot be hidden
    const hiddenSet = new Set(
      hiddenIds.filter((id) => {
        const item = tree.body.find((i) => getItemId(i) === id);
        return !item || !isLocked(item);
      })
    );

    const lockedItems: typeof tree.body = [];
    const regularItems: typeof tree.body = [];

    for (const item of tree.body) {
      if (isLocked(item)) {
        lockedItems.push(item);
      } else {
        regularItems.push(item);
      }
    }

    const itemMap = new Map(regularItems.map((item) => [getItemId(item), item]));

    const orderedRegularItems: typeof tree.body = [];
    for (const id of order) {
      const item = itemMap.get(id);
      // Skip if item is locked or not found
      if (!item || isLocked(item)) continue;

      orderedRegularItems.push(item);
      itemMap.delete(id);
    }

    for (const item of itemMap.values()) {
      orderedRegularItems.push(item);
    }

    // Apply hidden status to regular items
    const processedRegularItems = orderedRegularItems.map((item) => {
      const itemId = getItemId(item);
      if (itemId && hiddenSet.has(itemId)) {
        return { ...item, sideNavStatus: 'hiddenByUser' as const };
      }
      return item;
    });

    return {
      ...tree,
      body: [...lockedItems, ...processedRegularItems],
    };
  }

  /**
   * Initialize customizations from localStorage.
   */
  private initCustomNavigationFromStorage() {
    try {
      const stored = localStorage.getItem(
        ProjectNavigationCustomizationService.CUSTOM_NAV_STORAGE_KEY
      );
      if (!stored) return;

      const data = JSON.parse(stored) as SolutionNavigationCustomizations;
      this.solutionNavigationCustomizations$.next(data);
    } catch (e) {
      // Silently fail
    }
  }

  /**
   * Persist current customizations to localStorage.
   */
  private persistNavigationCustomizations() {
    try {
      const current = this.solutionNavigationCustomizations$.getValue();

      if (Object.keys(current).length === 0) {
        localStorage.removeItem(ProjectNavigationCustomizationService.CUSTOM_NAV_STORAGE_KEY);
      } else {
        localStorage.setItem(
          ProjectNavigationCustomizationService.CUSTOM_NAV_STORAGE_KEY,
          JSON.stringify(current)
        );
      }
    } catch (e) {
      // Silently fail
    }
  }
}
