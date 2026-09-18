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
  OverlayFlyoutTemplateContent,
  OverlayFlyoutTemplateOpenOptions,
  OverlaySystemFlyoutOpenOptions,
  OverlaySystemFlyoutStart,
  OverlayFlyoutTemplateStart,
  SystemFlyoutType,
} from '@kbn/core-overlays-browser';
import { SystemFlyoutTypeContext } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { FlyoutTemplateManagedProvider } from '@kbn/flyout-template';
import type { FlyoutTemplateManaged } from '@kbn/flyout-template';
import { SystemFlyoutRef } from './system_flyout_ref';
import { FlyoutMountGuard } from './flyout_mount_guard';

interface SystemFlyoutTypeControllerProps {
  /** The `type` open option, used to seed the reactive state. */
  initialType: SystemFlyoutType | undefined;
  /**
   * Render-prop receiving the current (reactive) flyout type, so the enclosing
   * `EuiFlyout` markup only needs to thread `type` through.
   */
  children: (type: SystemFlyoutType) => React.ReactNode;
}

/**
 * Owns the reactive push/overlay `type` of a system flyout and exposes it via
 * {@link SystemFlyoutTypeContext}. Because the state lives here — above the
 * `EuiFlyout` — content rendered inside the flyout can switch push/overlay and
 * have the live flyout re-render, rather than the change only applying on the
 * next open.
 */
const SystemFlyoutTypeController: React.FC<SystemFlyoutTypeControllerProps> = ({
  initialType,
  children,
}) => {
  const [type, setType] = React.useState<SystemFlyoutType>(initialType ?? 'overlay');
  const value = React.useMemo(() => ({ type, setType }), [type]);
  return (
    <SystemFlyoutTypeContext.Provider value={value}>
      {children(type)}
    </SystemFlyoutTypeContext.Provider>
  );
};

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
   * The element EUI applies push-flyout offset padding to (the flyout manager's container element),
   * captured while non-null. Used by {@link resetPushOffsetIfIdle} to clear a stranded offset once
   * the last flyout closes.
   */
  private pushOffsetContainer: HTMLElement | null = null;
  private managerUnsubscribe: (() => void) | null = null;

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
    onClose?: () => void;
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
      this.resetPushOffsetIfIdle();
    });

    // Idempotent: the flyout template composes this into the element's own `onClose`, so a
    // content handler that forwards the prop reaches it twice. `options.onClose` must fire once.
    const onCloseFlyout = () => {
      if (flyoutRef.isClosed) {
        return;
      }
      try {
        onClose?.();
      } finally {
        flyoutRef.close();
      }
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

    // Workaround for https://github.com/elastic/eui/issues/9788 — EUI's per-flyout cleanup can
    // restore stale padding and leave the push offset stranded. Remove once fixed upstream.
    //
    // A `type="push"` flyout makes EUI write inline offset padding onto its container element (or
    // `document.body`). Each system flyout renders in its own React root, so EUI's per-flyout
    // cleanup of that padding can race across roots and strand the offset on the container when the
    // flyouts tear down. Track the container while it's set so we can reset it on the last close.
    if (!this.managerUnsubscribe) {
      const managerStore = getFlyoutManagerStore();
      this.managerUnsubscribe = managerStore.subscribe(() => {
        const containerElement = managerStore.getState().containerElement;
        if (containerElement) {
          this.pushOffsetContainer = containerElement;
        }
      });
    }

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
            {/* `OverlaySystemFlyoutOpenOptions` is built from `Omit<EuiFlyoutProps |
                EuiFlyoutResizableProps, …>`; omitting over that union widens `type`, so narrow it
                back to `SystemFlyoutType` to seed the controller. */}
            <SystemFlyoutTypeController initialType={options.type as SystemFlyoutType | undefined}>
              {(type) => (
                <EuiFlyout
                  {...options}
                  id={flyoutElementId}
                  type={type}
                  flyoutMenuProps={mergedFlyoutMenuProps}
                  session={session}
                  onClose={onCloseFlyout}
                  aria-label={options['aria-label']}
                  aria-labelledby={options['aria-labelledby']}
                >
                  {content}
                </EuiFlyout>
              )}
            </SystemFlyoutTypeController>
          </KibanaRenderContextProvider>,
          flyoutContainer
        );

        return flyoutRef;
      },

      openTemplate: (
        options: OverlayFlyoutTemplateOpenOptions,
        Content: OverlayFlyoutTemplateContent
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

        // `onClose` is deliberately absent: the template keeps it a required element prop, fed
        // by the `onClose` handed to `Content`, and composes `close` in behind it.
        const managed: FlyoutTemplateManaged = {
          props: { ...templateProps, id: flyoutElementId },
          close: onCloseFlyout,
        };

        render(
          <KibanaRenderContextProvider
            analytics={analytics}
            i18n={i18n}
            theme={theme}
            userProfile={userProfile}
          >
            <FlyoutTemplateManagedProvider value={managed}>
              <FlyoutMountGuard onError={onCloseFlyout}>
                <Content onClose={onCloseFlyout} />
              </FlyoutMountGuard>
            </FlyoutTemplateManagedProvider>
          </KibanaRenderContextProvider>,
          flyoutContainer
        );

        return flyoutRef;
      },
    };
  }

  /**
   * Reset any push-flyout offset once no flyouts remain open.
   *
   * A `type="push"` flyout makes EUI write inline offset padding onto its container element (the app
   * content area) or `document.body`. Because each system flyout renders in its own React root,
   * EUI's per-flyout cleanup of that padding can race across roots and leave the offset stranded on
   * teardown — the page stays pushed with no flyout open. Once nothing is open there can be no push
   * offset, so clear it deterministically here.
   */
  private resetPushOffsetIfIdle(): void {
    if (this.activeFlyouts.size > 0) {
      return;
    }
    this.clearStrandedPushOffset();
    // A late effect or ResizeObserver callback from the tearing-down flyout roots can re-apply the
    // offset after this microtask, so clear once more on the next frame — still only while idle.
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        if (this.activeFlyouts.size === 0) {
          this.clearStrandedPushOffset();
        }
      });
    }
  }

  /**
   * Remove any inline push-offset padding EUI left on the flyout container (resolved from both the
   * tracked reference and the live manager store) or `document.body`. Only inline styles are
   * touched, so the chrome layout's own `padding` rules are unaffected.
   */
  private clearStrandedPushOffset(): void {
    const containerFromStore = getFlyoutManagerStore().getState().containerElement ?? null;
    const targets = [this.pushOffsetContainer, containerFromStore, document.body].filter(
      (el): el is HTMLElement => el != null
    );
    const paddingProps = ['padding-inline-start', 'padding-inline-end'];
    for (const el of targets) {
      for (const prop of paddingProps) {
        el.style.removeProperty(prop);
      }
    }
  }

  /**
   * Cleanup method for when the service is stopped
   */
  public closeAllFlyouts(): void {
    this.activeFlyouts.forEach((flyout) => flyout.close());
    this.activeFlyouts.clear();
    this.resetPushOffsetIfIdle();
  }

  public stop(): void {
    this.closeAllFlyouts();
    this.managerUnsubscribe?.();
    this.managerUnsubscribe = null;
    this.pushOffsetContainer = null;
    this.targetDomElement = null;
  }
}
