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

import { EuiFlyout, getFlyoutManagerStore, type EuiFlyoutMenuProps } from '@elastic/eui';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type {
  OverlaySystemFlyoutOpenOptions,
  OverlaySystemFlyoutStart,
} from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { SystemFlyoutRef } from './system_flyout_ref';

const DEBUG_PREFIX = '[SystemFlyoutService]';

interface SystemFlyoutStartDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  targetDomElement: Element;
}

/**
 * Service for managing system flyouts that integrate with the EUI Flyout Manager.
 * Supports non-React contexts while preserving React context and EUI Flyout System features.
 */
export class SystemFlyoutService {
  private targetDomElement: Element | null = null;
  private activeFlyouts = new Map<string, SystemFlyoutRef>();

  public start({
    analytics,
    i18n,
    theme,
    userProfile,
    targetDomElement,
  }: SystemFlyoutStartDeps): OverlaySystemFlyoutStart {
    console.debug(`${DEBUG_PREFIX} start() called`, {
      hasTargetDomElement: !!targetDomElement,
      targetTagName: targetDomElement?.tagName,
      activeFlyoutsCount: this.activeFlyouts.size,
    });
    this.targetDomElement = targetDomElement;

    return {
      open: (
        content: React.ReactElement,
        { session = 'start', title, ...options }: OverlaySystemFlyoutOpenOptions = {}
      ): OverlayRef => {
        const { flyoutMenuProps } = options;
        const flyoutId = `system-flyout-${uuidV4()}`;

        console.debug(`${DEBUG_PREFIX} open() invoked`, {
          flyoutId,
          session,
          title,
          optionsId: options.id,
          hasFlyoutMenuProps: !!flyoutMenuProps,
          hasOnClose: !!options.onClose,
          contentType: content?.type?.displayName ?? content?.type?.name ?? typeof content?.type,
          activeFlyoutsBefore: this.activeFlyouts.size,
        });

        // Create a container for this flyout within the main React tree
        const flyoutContainer = document.createElement('div');
        flyoutContainer.setAttribute('data-system-flyout', flyoutId);
        this.targetDomElement!.appendChild(flyoutContainer);
        console.debug(`${DEBUG_PREFIX} open() created and appended container`, {
          flyoutId,
          targetHasChild: this.targetDomElement!.contains(flyoutContainer),
        });

        const flyoutRef = new SystemFlyoutRef(flyoutContainer);
        this.activeFlyouts.set(flyoutId, flyoutRef);
        console.debug(`${DEBUG_PREFIX} open() SystemFlyoutRef created and registered`, {
          flyoutId,
          activeFlyoutsCount: this.activeFlyouts.size,
        });

        // Handle close events
        flyoutRef.onClose.then(() => {
          console.debug(`${DEBUG_PREFIX} open() flyoutRef.onClose resolved`, { flyoutId });
          this.activeFlyouts.delete(flyoutId);
          console.debug(`${DEBUG_PREFIX} open() removed from activeFlyouts`, {
            flyoutId,
            activeFlyoutsCount: this.activeFlyouts.size,
          });
        });

        const onCloseFlyout = () => {
          console.debug(`${DEBUG_PREFIX} onCloseFlyout callback invoked`, {
            flyoutId,
            hasOptionsOnClose: !!options.onClose,
          });
          if (options.onClose) {
            options.onClose(flyoutRef);
          }
          flyoutRef.close();
        };

        // title and other flyoutMenuProps: flyoutMenuProps.title takes precedence over top-level title
        let mergedFlyoutMenuProps: EuiFlyoutMenuProps | undefined;
        if (title || flyoutMenuProps) {
          mergedFlyoutMenuProps = { title, ...flyoutMenuProps };
        }
        console.debug(`${DEBUG_PREFIX} open() merged flyout menu props`, {
          flyoutId,
          hasMergedFlyoutMenuProps: !!mergedFlyoutMenuProps,
          mergedTitle: mergedFlyoutMenuProps?.title,
        });

        // Subscribe to EUI flyout manager store to detect cascade closes
        // This ensures child flyouts close when their parent closes, even across separate React roots
        if (session !== 'never') {
          // Use the EUI flyout ID (from options.id) for store lookups, not our internal container ID
          const euiFlyoutId = options.id || flyoutId;

          console.debug(`${DEBUG_PREFIX} open() subscribing to flyout manager (session !== 'never')`, {
            flyoutId,
            euiFlyoutId,
            session,
          });

          const { subscribeToEvents } = getFlyoutManagerStore();

          const unsubscribe = subscribeToEvents((event) => {
            console.debug(`${DEBUG_PREFIX} flyout manager event received`, {
              flyoutId,
              euiFlyoutId,
              eventType: event.type,
              eventSession: event.type === 'CLOSE_SESSION' ? event.session : undefined,
            });
            if (event.type !== 'CLOSE_SESSION') {
              return;
            }

            const { mainFlyoutId, childFlyoutId } = event.session;
            const shouldClose = euiFlyoutId === mainFlyoutId || euiFlyoutId === childFlyoutId;

            console.debug(`${DEBUG_PREFIX} CLOSE_SESSION evaluated`, {
              flyoutId,
              euiFlyoutId,
              mainFlyoutId,
              childFlyoutId,
              shouldClose,
              flyoutRefIsClosed: flyoutRef.isClosed,
            });

            if (shouldClose && !flyoutRef.isClosed) {
              console.debug(`${DEBUG_PREFIX} closing flyout due to CLOSE_SESSION`, { flyoutId });
              flyoutRef.close();
              unsubscribe();
              this.activeFlyouts.delete(flyoutId);
            }
          });

          // Clean up subscription when flyout closes normally
          flyoutRef.onClose.then(() => {
            console.debug(`${DEBUG_PREFIX} open() cleaning up flyout manager subscription`, {
              flyoutId,
            });
            unsubscribe();
          });
        } else {
          console.debug(`${DEBUG_PREFIX} open() skipping flyout manager subscription (session === 'never')`, {
            flyoutId,
            session,
          });
        }

        // Render the flyout content using EuiFlyout with session management
        // This ensures full EUI Flyout System integration
        console.debug(`${DEBUG_PREFIX} open() rendering EuiFlyout into container`, {
          flyoutId,
          session,
          hasMergedFlyoutMenuProps: !!mergedFlyoutMenuProps,
        });
        render(
          <KibanaRenderContextProvider
            analytics={analytics}
            i18n={i18n}
            theme={theme}
            userProfile={userProfile}
          >
            <EuiFlyout
              {...options}
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
        console.debug(`${DEBUG_PREFIX} open() render complete, returning flyoutRef`, { flyoutId });

        return flyoutRef;
      },
    };
  }

  /**
   * Cleanup method for when the service is stopped
   */
  public stop(): void {
    console.debug(`${DEBUG_PREFIX} stop() called`, {
      activeFlyoutsCount: this.activeFlyouts.size,
      hasTargetDomElement: !!this.targetDomElement,
    });
    this.closeAllSystemFlyouts();
    this.targetDomElement = null;
    console.debug(`${DEBUG_PREFIX} stop() complete`);
  }

  private closeAllSystemFlyouts(): void {
    console.debug(`${DEBUG_PREFIX} closeAllSystemFlyouts()`, {
      count: this.activeFlyouts.size,
      flyoutIds: Array.from(this.activeFlyouts.keys()),
    });
    this.activeFlyouts.forEach((flyout) => flyout.close());
    this.activeFlyouts.clear();
    console.debug(`${DEBUG_PREFIX} closeAllSystemFlyouts() done`);
  }
}
