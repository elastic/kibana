/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { lazy, Suspense } from 'react';
import { ReplaySubject, takeUntil } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import type {
  AppDeepLinkId,
  ChromeProjectNavigationNode,
  NavigationCustomization,
} from '@kbn/core-chrome-browser';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import { getNavigationNodeIcon } from '@kbn/core-chrome-browser-navigation-utils';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { i18n } from '@kbn/i18n';
import { NAV_CUSTOMIZATION_STORAGE_KEY } from '../../common/constants';

const LazyCustomizeNavigationUserMenuLink = lazy(async () => {
  const { CustomizeNavigationUserMenuLink } = await import(
    '@kbn/navigation-customization-components'
  );
  return { default: CustomizeNavigationUserMenuLink };
});

export interface NavigationCustomizationServiceStartDeps {
  core: CoreStart;
  chrome: InternalChromeStart;
  isUnauthenticated: boolean;
}

export interface NavigationCustomizationServiceUiDeps {
  core: CoreStart;
  chrome: InternalChromeStart;
  security?: SecurityPluginStart;
}

/**
 * Owns all navigation-customization concerns: stored-customization sync,
 * chrome handler registration, and user-menu link rendering.
 *
 * Both `handlerRegistered` and `menuLinkAdded` are tracked independently so
 * callers can invoke `enableUi` from different code paths (stateful handler
 * registration is synchronous; menu-link registration is async after the
 * active space resolves) without double-registering either capability.
 */
export class NavigationCustomizationService {
  private readonly stop$ = new ReplaySubject<void>(1);
  private handlerRegistered = false;
  private menuLinkAdded = false;

  /**
   * Subscribes to the stored customization key and reactively applies it to
   * the project navigation. Must be called once per plugin lifecycle; skips
   * the subscription if the user is unauthenticated.
   *
   * The initial emission is synchronous because NAV_CUSTOMIZATION_STORAGE_KEY
   * is registered with `preload: true` on the server (see
   * navigation/server/plugin.ts), so the value is server-injected at page
   * load. This synchrony ensures the stored customization reaches
   * setNavigationCustomization before any solution plugin calls
   * chrome.project.initNavigation(), preventing a startup race that would
   * silently discard the user's saved preferences. If this key ever loses
   * preload: true the seed becomes async and the race returns.
   *
   * Subsequent emissions handle multi-tab sync.
   */
  start({ core, chrome, isUnauthenticated }: NavigationCustomizationServiceStartDeps): void {
    if (isUnauthenticated) return;

    core.userStorage
      .get$<NavigationCustomization>(NAV_CUSTOMIZATION_STORAGE_KEY)
      .pipe(takeUntil(this.stop$))
      .subscribe((customization) => {
        chrome.project.setNavigationCustomization(customization);
      });
  }

  /**
   * Enables the customization UI. Each capability is independently idempotent:
   *
   * - Chrome handler: registered on the first call regardless of whether
   *   `security` is provided. Safe to call synchronously (before the active
   *   space is confirmed) because the handler is looked up lazily by chrome
   *   when the user actually clicks the customize button.
   *
   * - User-menu link: added the first time `security` is provided. In
   *   stateful mode this happens after the active space has confirmed a
   *   project-nav solution; in serverless mode both capabilities are enabled
   *   together inside the `getNavigation$` subscription.
   */
  enableUi({ core, chrome, security }: NavigationCustomizationServiceUiDeps): void {
    if (!this.handlerRegistered) {
      this.handlerRegistered = true;
      chrome.project.registerCustomizeNavigationHandler(() => this.openModal(core, chrome));
    }

    if (!this.menuLinkAdded && security) {
      this.menuLinkAdded = true;

      const openModal = () => this.openModal(core, chrome);

      security.navControlService.addUserMenuLinks([
        {
          iconType: 'controls',
          label: i18n.translate('navigation.userMenuLinkLabel', {
            defaultMessage: 'Customize navigation',
          }),
          href: '',
          order: 500,
          content: ({ closePopover }) => (
            <Suspense fallback={null}>
              <LazyCustomizeNavigationUserMenuLink
                closePopover={closePopover}
                onClick={openModal}
              />
            </Suspense>
          ),
        },
      ]);
    }
  }

  stop(): void {
    this.stop$.next();
  }

  private openModal(core: CoreStart, chrome: InternalChromeStart): void {
    const run = async () => {
      // Lazy-load the modal and computeMoves together — they pull in heavy
      // dnd + EUI dependencies and the LCS algorithm that should not be in
      // the page-load bundle.
      const [{ CustomizeNavigationModal }, { computeMoves }] = await Promise.all([
        import('@kbn/navigation-customization-components'),
        import('./compute_moves'),
      ]);

      const { items, defaultItemIds } = this.getNavigationItems(chrome);

      const savedCustomization = core.userStorage.get<NavigationCustomization>(
        NAV_CUSTOMIZATION_STORAGE_KEY
      );
      const toCustomization = (
        order: string[],
        hiddenIds: string[],
        showPrimaryItemLabels: boolean
      ): NavigationCustomization => ({
        moves: computeMoves(defaultItemIds, order),
        hidden: hiddenIds as AppDeepLinkId[],
        showPrimaryItemLabels,
      });

      const modal = core.overlays.openModal(
        toMountPoint(
          core.rendering.addContext(
            <CustomizeNavigationModal
              items={items}
              showPrimaryItemLabels={savedCustomization?.showPrimaryItemLabels ?? true}
              onChange={(order, hiddenIds, showPrimaryItemLabels) => {
                chrome.project.setNavigationCustomization(
                  toCustomization(order, hiddenIds, showPrimaryItemLabels)
                );
              }}
              onSave={(order, hiddenIds, showPrimaryItemLabels) => {
                core.userStorage.set(
                  NAV_CUSTOMIZATION_STORAGE_KEY,
                  toCustomization(order, hiddenIds, showPrimaryItemLabels)
                );
                modal.close();
              }}
              onReset={() => {
                chrome.project.setNavigationCustomization(undefined);
                core.userStorage.remove(NAV_CUSTOMIZATION_STORAGE_KEY);
                return this.getNavigationItems(chrome).items;
              }}
              onClose={() => {
                chrome.project.setNavigationCustomization(savedCustomization);
                modal.close();
              }}
            />
          ),
          core
        )
      );
    };

    run();
  }

  private getNavigationItems(chrome: InternalChromeStart): {
    items: Array<{ id: string; title: string; hidden: boolean; icon?: string }>;
    defaultItemIds: string[];
  } {
    let renderableNodes: ChromeProjectNavigationNode[] = [];
    let overflowItemIds: string[] = [];
    // The true default order, captured by the service from the raw nav definition
    // before any customization moves are applied. Deriving the default order from
    // renderableNodes here would be wrong: those nodes are already in the user's
    // customized order, so the modal would diff the customized order against itself
    // and silently wipe the saved customization on the first onChange.
    let defaultItemIds: string[] = [];

    chrome.project
      .getNavigation$()
      .subscribe((nav) => {
        renderableNodes = nav.renderableNodes;
        overflowItemIds = nav.overflowItemIds;
        defaultItemIds = nav.defaultItemIds;
      })
      .unsubscribe();

    const overflowSet = new Set(overflowItemIds);
    const items = renderableNodes.map((node) => ({
      id: node.id,
      title: (node.title ?? node.id) as string,
      hidden: overflowSet.has(node.id),
      icon: getNavigationNodeIcon(node),
    }));

    return { items, defaultItemIds };
  }
}
