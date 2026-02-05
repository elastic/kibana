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
    this.targetDomElement = targetDomElement;

    return {
      open: (
        content: React.ReactElement,
        { session = 'start', title, ...options }: OverlaySystemFlyoutOpenOptions = {}
      ): OverlayRef => {
        const { flyoutMenuProps } = options;
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

        // Subscribe to EUI flyout manager store to detect cascade closes
        // This ensures child flyouts close when their parent closes, even across separate React roots
        if (session !== 'never') {
          // Use the EUI flyout ID (from options.id) for store lookups, not our internal container ID
          const euiFlyoutId = options.id || flyoutId;

          const { subscribeToEvents } = getFlyoutManagerStore();

          const unsubscribe = subscribeToEvents((event) => {
            if (event.type !== 'CLOSE_SESSION') {
              return;
            }

            const { mainFlyoutId, childFlyoutId } = event.session;
            const shouldClose = euiFlyoutId === mainFlyoutId || euiFlyoutId === childFlyoutId;

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
    };
  }

  /**
   * Cleanup method for when the service is stopped
   */
  public stop(): void {
    this.closeAllSystemFlyouts();
    this.targetDomElement = null;
  }

  private closeAllSystemFlyouts(): void {
    this.activeFlyouts.forEach((flyout) => flyout.close());
    this.activeFlyouts.clear();
  }
}
