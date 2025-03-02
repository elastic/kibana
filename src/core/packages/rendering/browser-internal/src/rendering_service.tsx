/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { pairwise, startWith } from 'rxjs';

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { InternalApplicationStart } from '@kbn/core-application-browser-internal';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import { KibanaRootContextProvider } from '@kbn/react-kibana-context-root';

import {
  KibanaWorkspace,
  FeedbackTool,
  RecentlyAccessedTool,
} from '@kbn/core-workspace-components';
import { InternalHttpStart } from '@kbn/core-http-browser-internal';
import { CustomBrandingStart } from '@kbn/core-custom-branding-browser';
import { WORKSPACE_TOOL_FEEDBACK, WORKSPACE_TOOL_RECENT } from '@kbn/core-chrome-browser';

interface StartServices {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
}

export interface StartDeps extends StartServices {
  application: InternalApplicationStart;
  chrome: InternalChromeStart;
  overlays: OverlayStart;
  targetDomElement: HTMLDivElement;
  http: InternalHttpStart;
  customBranding: CustomBrandingStart;
}

/**
 * Renders all Core UI in a single React tree.
 *
 * @internalRemarks Currently this only renders Chrome UI. Notifications and
 * Overlays UI should be moved here as well.
 *
 * @internal
 */
export class RenderingService {
  start({
    application,
    chrome,
    overlays,
    targetDomElement,
    http,
    customBranding,
    theme,
    ...startServices
  }: StartDeps) {
    // const bannerComponent = overlays.banners.getComponent();

    const body = document.querySelector('body')!;
    chrome
      .getBodyClasses$()
      .pipe(startWith<string[]>([]), pairwise())
      .subscribe(([previousClasses, newClasses]) => {
        body.classList.remove(...previousClasses);
        body.classList.add(...newClasses);
      });

    const component = application.getComponent() || <></>;
    const { workspace } = chrome;
    const { getActiveNodes$, getProjectSideNavComponent$ } = chrome.projectNavigation;
    const { currentActionMenu$ } = application;

    workspace.toolbox.registerTool({
      toolId: WORKSPACE_TOOL_RECENT,
      button: {
        iconType: 'clock',
      },
      tool: {
        title: 'Recently viewed',
        children: (
          <RecentlyAccessedTool
            recentlyAccessed$={chrome.recentlyAccessed.get$()}
            navigateToUrl={application.navigateToUrl}
          />
        ),
      },
    });

    workspace.toolbox.registerTool({
      toolId: WORKSPACE_TOOL_FEEDBACK,
      button: {
        iconType: 'editorComment',
      },
      tool: {
        title: 'Feedback',
        children: <FeedbackTool />,
      },
    });

    // TODO: unpack observables here, props changes will handle the rest.

    ReactDOM.render(
      <KibanaRootContextProvider {...startServices} theme={theme} globalStyles={true}>
        <KibanaWorkspace
          {...{
            workspace,
            getActiveNodes$,
            currentActionMenu$,
            getProjectSideNavComponent$,
          }}
        >
          {component}
        </KibanaWorkspace>
      </KibanaRootContextProvider>,
      targetDomElement
    );
  }
}
