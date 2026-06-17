/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { RouteComponentProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { HashRouter as Router, Routes, Route } from '@kbn/shared-ux-router';
import { i18n } from '@kbn/i18n';

import type {
  ApplicationStart,
  ChromeStart,
  ScopedHistory,
  ExecutionContextStart,
} from '@kbn/core/public';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { css } from '@emotion/react';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderBadge, AppHeaderTab } from '@kbn/app-header';
import type { DocTitleService, BreadcrumbService } from './services';

import type { DevToolApp } from './dev_tool';
import type { DevToolsStartServices } from './types';

export interface AppServices {
  docTitleService: DocTitleService;
  breadcrumbService: BreadcrumbService;
  executionContext: ExecutionContextStart;
}

interface DevToolsWrapperProps {
  devTools: readonly DevToolApp[];
  activeDevTool: DevToolApp;
  history: RouteComponentProps['history'];
  appServices: AppServices;
  location: RouteComponentProps['location'];
  startServices: DevToolsStartServices;
  badges?: AppHeaderBadge[];
}

interface MountedDevToolDescriptor {
  devTool: DevToolApp;
  mountpoint: HTMLElement;
  unmountHandler: () => void;
}

const devAppContainerStyles = css`
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;

  > * {
    flex-shrink: 0;
  }
`;

export const staticStyles = {
  devAppContainer: devAppContainerStyles,

  devApp: devAppContainerStyles,
};

function DevToolsWrapper({
  devTools,
  activeDevTool,
  history,
  appServices,
  location,
  startServices,
  badges,
}: DevToolsWrapperProps) {
  const { docTitleService, breadcrumbService } = appServices;
  const mountedTool = useRef<MountedDevToolDescriptor | null>(null);

  useEffect(
    () => () => {
      if (mountedTool.current) {
        mountedTool.current.unmountHandler();
      }
    },
    []
  );

  useEffect(() => {
    docTitleService.setTitle(activeDevTool.title);
    breadcrumbService.setBreadcrumbs(activeDevTool.title);
  }, [activeDevTool, docTitleService, breadcrumbService]);

  const headerTabs = useMemo<AppHeaderTab[]>(
    () =>
      devTools.map((currentDevTool) => ({
        id: currentDevTool.id,
        label: currentDevTool.title,
        isSelected: currentDevTool === activeDevTool,
        disabled: currentDevTool.isDisabled(),
        tooltipContent: currentDevTool.tooltipContent,
        onClick: () => {
          if (!currentDevTool.isDisabled()) {
            history.push(`/${currentDevTool.id}`);
          }
        },
      })),
    [devTools, activeDevTool, history]
  );

  return (
    <main css={staticStyles.devApp}>
      <AppHeader
        title={i18n.translate('devTools.appHeader.title', { defaultMessage: 'Developer tools' })}
        tabs={headerTabs}
        badges={badges}
      />
      <div
        css={staticStyles.devAppContainer}
        role="tabpanel"
        data-test-subj={activeDevTool.id}
        ref={async (element) => {
          if (
            element &&
            (mountedTool.current === null ||
              mountedTool.current.devTool !== activeDevTool ||
              mountedTool.current.mountpoint !== element)
          ) {
            if (mountedTool.current) {
              mountedTool.current.unmountHandler();
            }

            const params = {
              element,
              location,
              history,
              ...startServices,
            };

            const unmountHandler = await activeDevTool.mount(params);

            mountedTool.current = {
              devTool: activeDevTool,
              mountpoint: element,
              unmountHandler,
            };
          }
        }}
      />
    </main>
  );
}

function redirectOnMissingCapabilities(application: ApplicationStart) {
  if (!application.capabilities.dev_tools.show) {
    application.navigateToApp('home');
    return true;
  }
  return false;
}

function getBadges(application: ApplicationStart): AppHeaderBadge[] | undefined {
  if (application.capabilities.dev_tools.save) {
    return undefined;
  }

  return [
    {
      label: i18n.translate('devTools.badge.readOnly.text', {
        defaultMessage: 'Read only',
      }),
      tooltip: i18n.translate('devTools.badge.readOnly.tooltip', {
        defaultMessage: 'Unable to save',
      }),
    },
  ];
}

export function renderApp(
  element: HTMLElement,
  application: ApplicationStart,
  chrome: ChromeStart,
  history: ScopedHistory,
  devTools: readonly DevToolApp[],
  appServices: AppServices,
  startServices: DevToolsStartServices,
  rendering: RenderingService
) {
  if (redirectOnMissingCapabilities(application)) {
    return () => {};
  }

  const badges = getBadges(application);

  ReactDOM.render(
    rendering.addContext(
      <Router>
        <Routes>
          {devTools
            // Only create routes for devtools that are not disabled
            .filter((devTool) => !devTool.isDisabled())
            .map((devTool) => (
              <Route
                key={devTool.id}
                path={`/${devTool.id}`}
                exact={!devTool.enableRouting}
                render={(props) => (
                  <DevToolsWrapper
                    history={props.history}
                    location={props.location}
                    activeDevTool={devTool}
                    devTools={devTools}
                    appServices={appServices}
                    startServices={startServices}
                    badges={badges}
                  />
                )}
              />
            ))}
          <Route path="/">
            <Redirect to={`/${devTools[0].id}`} />
          </Route>
        </Routes>
      </Router>
    ),
    element
  );

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlisten = history.listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  return () => {
    chrome.docTitle.reset();
    ReactDOM.unmountComponentAtNode(element);
    unlisten();
  };
}
