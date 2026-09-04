/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from 'react-dom';
import { v4 as uuidV4 } from 'uuid';

import type { EuiFlyoutMenuProps, EuiFlyoutProps } from '@elastic/eui';
import { EuiFlyout, getFlyoutManagerStore } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type {
  OverlayFlyoutTemplateChildren,
  OverlayFlyoutTemplateOpenOptions,
  OverlaySystemFlyoutOpenOptions,
  OverlaySystemFlyoutStart,
  OverlayFlyoutTemplateStart,
} from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { SystemFlyoutRef } from './system_flyout_ref';

interface SystemFlyoutStartDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  targetDomElement: Element;
}

/**
 * Combined internal start contract. The public `OverlaySystemFlyoutStart` and
 * `OverlayFlyoutTemplateStart` types are kept separate (and each `open`-only) so that
 * `OverlayStart` exposes each under its own distinct method name; `start()` returns both.
 */
interface SystemFlyoutServiceStart {
  open: OverlaySystemFlyoutStart['open'];
  openTemplate: OverlayFlyoutTemplateStart['open'];
}

/** Shared plumbing needed by both `open` and `openTemplate` to build a managed flyout. */
interface ManagedFlyout {
  flyoutContainer: HTMLDivElement;
  flyoutRef: SystemFlyoutRef;
  /** The id the rendered flyout must carry for the cascade-close subscription to match it. */
  flyoutElementId?: string;
  /** Wraps the consumer's `onClose`, then always closes the ref. Pass as the rendered element's `onClose`. */
  onCloseFlyout: () => void;
}

/**
 * Service for managing system flyouts that integrate with the EUI Flyout Manager.
 * Supports non-React contexts while preserving React context and EUI Flyout System features.
 */
export class SystemFlyoutService {
  private targetDomElement: Element | null = null;
  private activeFlyouts = new Map<string, SystemFlyoutRef>();

  /**
   * Container creation, ref/bookkeeping, the `onClose` wrapper, and the `session: 'inherit'`
   * cascade-close subscription — everything `open` and `openTemplate` share except the
   * rendered element itself.
   *
   * `session` is read (not consumed) by both callers: `open` destructures it out of its
   * options and forwards it to `EuiFlyout` explicitly, while `openTemplate` leaves it on
   * the descriptor spread so `FlyoutTemplate` applies its own `session = 'start'` default
   * and forwards it down. Only this method's own default (also `'start'`) is used to decide
   * whether to subscribe to `CLOSE_SESSION`.
   */
  private createManagedFlyout({
    session = 'start',
    id,
    onClose,
  }: {
    session?: EuiFlyoutProps['session'];
    id?: string;
    onClose?: (flyout: OverlayRef) => void;
  }): ManagedFlyout {
    const flyoutId = `system-flyout-${uuidV4()}`;

    // Create a container for this flyout within the main React tree
    const flyoutContainer = document.createElement('div');
    flyoutContainer.setAttribute('data-system-flyout', flyoutId);
    this.targetDomElement!.appendChild(flyoutContainer);

    const flyoutRef = new SystemFlyoutRef(flyoutContainer);
    this.activeFlyouts.set(flyoutId, flyoutRef);

    // Handle close events
    flyoutRef.onClose.then(() => {
      this.activeFlyouts.delete(flyoutId);
    });

    const onCloseFlyout = () => {
      onClose?.(flyoutRef);
      flyoutRef.close();
    };

    // A child flyout has to be rendered with the id the subscription below matches on. Left
    // without an `id` prop, EUI's `useFlyoutId` generates one that nothing here can observe,
    // so no CLOSE_SESSION event would ever match.
    const flyoutElementId = session === 'inherit' ? id || flyoutId : id;

    // Subscribe to CLOSE_SESSION events for cascade closes of child flyouts.
    // When a parent session closes, child flyouts in separate React roots must
    // be explicitly closed since their deferred useEffect detection may not fire
    // reliably across roots.
    //
    // IMPORTANT: We only handle child flyouts here (session === 'inherit').
    // Main flyouts (session === 'start') must NOT be closed synchronously via
    // this handler because unmountComponentAtNode triggers a useLayoutEffect
    // cleanup that reads a stale ref (flyoutExistsInManagerRef) and calls
    // closeAllFlyouts(), which would inadvertently close unrelated sessions
    // (e.g., during goBack navigation).
    if (session === 'inherit') {
      const euiFlyoutId = flyoutElementId;
      const { subscribeToEvents } = getFlyoutManagerStore();

      const unsubscribe = subscribeToEvents((event) => {
        if (event.type !== 'CLOSE_SESSION') {
          return;
        }

        const { childFlyoutId, childHistory } = event.session;
        const shouldClose =
          euiFlyoutId === childFlyoutId ||
          childHistory?.some((entry) => entry.flyoutId === euiFlyoutId);

        if (shouldClose && !flyoutRef.isClosed) {
          flyoutRef.close();
          unsubscribe();
          this.activeFlyouts.delete(flyoutId);
        }
      });

      // Clean up subscription when flyout closes normally
      flyoutRef.onClose.then(() => {
        unsubscribe();
      });
    }

    return { flyoutContainer, flyoutRef, flyoutElementId, onCloseFlyout };
  }

  public start({
    analytics,
    i18n,
    theme,
    userProfile,
    targetDomElement,
  }: SystemFlyoutStartDeps): SystemFlyoutServiceStart {
    this.targetDomElement = targetDomElement;

    return {
      open: (
        content: React.ReactElement,
        { session = 'start', title, ...options }: OverlaySystemFlyoutOpenOptions = {}
      ): OverlayRef => {
        const { flyoutMenuProps } = options;
        const { flyoutContainer, flyoutRef, flyoutElementId, onCloseFlyout } =
          this.createManagedFlyout({
            session,
            id: options.id,
            onClose: options.onClose,
          });

        // title and other flyoutMenuProps: flyoutMenuProps.title takes precedence over top-level title
        let mergedFlyoutMenuProps: EuiFlyoutMenuProps | undefined;
        if (title || flyoutMenuProps) {
          mergedFlyoutMenuProps = { title, ...flyoutMenuProps };
        }

        // Render the flyout content using EuiFlyout with session management
        // This ensures full EUI Flyout System integration
        render(
          <KibanaRenderContextProvider
            analytics={analytics}
            i18n={i18n}
            theme={theme}
            userProfile={userProfile}
          >
            <EuiFlyout
              {...options}
              id={flyoutElementId}
              flyoutMenuProps={mergedFlyoutMenuProps}
              session={session}
              onClose={onCloseFlyout}
              aria-label={options['aria-label']}
              aria-labelledby={options['aria-labelledby']}
            >
              {content}
            </EuiFlyout>
          </KibanaRenderContextProvider>,
          flyoutContainer
        );

        return flyoutRef;
      },

      openTemplate: (
        options: OverlayFlyoutTemplateOpenOptions,
        children: OverlayFlyoutTemplateChildren
      ): OverlayRef => {
        // `session` is read but not consumed: `FlyoutTemplate` applies its own default and
        // forwards it down, so it stays on the spread.
        const { onClose, ...templateProps } = options;
        const { flyoutContainer, flyoutRef, flyoutElementId, onCloseFlyout } =
          this.createManagedFlyout({
            session: templateProps.session,
            id: templateProps.id,
            onClose,
          });

        // Invoked here rather than stored, so the zones it returns are literal children of
        // the template and are parsed as parts.
        let zones: React.ReactNode;
        try {
          zones = typeof children === 'function' ? children(FlyoutTemplate, flyoutRef) : children;
        } catch (error) {
          // Runs outside React, so the template's error boundary cannot take this; the
          // container and its `activeFlyouts` entry are already live and have to be released.
          flyoutRef.close();
          throw error;
        }

        render(
          <KibanaRenderContextProvider
            analytics={analytics}
            i18n={i18n}
            theme={theme}
            userProfile={userProfile}
          >
            <FlyoutTemplate {...templateProps} id={flyoutElementId} onClose={onCloseFlyout}>
              {zones}
            </FlyoutTemplate>
          </KibanaRenderContextProvider>,
          flyoutContainer
        );

        return flyoutRef;
      },
    };
  }

  /**
   * Cleanup method for when the service is stopped
   */
  public closeAllFlyouts(): void {
    this.activeFlyouts.forEach((flyout) => flyout.close());
    this.activeFlyouts.clear();
  }

  public stop(): void {
    this.closeAllFlyouts();
    this.targetDomElement = null;
  }
}
