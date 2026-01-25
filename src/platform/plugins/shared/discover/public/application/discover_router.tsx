/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteProps } from 'react-router-dom';
import { Redirect } from 'react-router-dom';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import type { PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import { EuiBetaBadge, EuiErrorBoundary } from '@elastic/eui';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { AppMountParameters, Capabilities } from '@kbn/core/public';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import type { ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { ContextAppRoute } from './context';
import { SingleDocRoute } from './doc';
import { NotFoundRoute } from './not_found';
import type { DiscoverServices } from '../build_services';
import { ViewAlertRoute } from './view_alert';
import type { DiscoverCustomizationContext } from '../customizations';
import { DiscoverMainRoute } from './main';
import { useDiscoverServices } from '../hooks/use_discover_services';

export interface DiscoverRouterProps {
  services: DiscoverServices;
  customizationContext: DiscoverCustomizationContext;
  onAppLeave: AppMountParameters['onAppLeave'];
}

export const DiscoverRouter = ({ services, ...routeProps }: DiscoverRouterProps) => {
  return (
    <KibanaContextProvider services={services}>
      <EuiErrorBoundary>
        <Router history={services.history} data-test-subj="discover-react-router">
          <RedirectAppLinks
            coreStart={{
              application: services.core.application,
            }}
          >
            <DiscoverRoutes {...routeProps} />
          </RedirectAppLinks>
        </Router>
      </EuiErrorBoundary>
    </KibanaContextProvider>
  );
};

const DiscoverRoutes = ({
  ...routeProps
}: Pick<DiscoverRouterProps, 'customizationContext' | 'onAppLeave'>) => {
  return (
    <Routes>
      <DiscoverRoute path="/context/:dataViewId/:id">
        <ContextAppRoute />
      </DiscoverRoute>
      <DiscoverRoute
        path="/doc/:dataView/:index/:type"
        render={(props) => (
          <Redirect to={`/doc/${props.match.params.dataView}/${props.match.params.index}`} />
        )}
      />
      <DiscoverRoute path="/doc/:dataViewId/:index">
        <SingleDocRoute />
      </DiscoverRoute>
      <DiscoverRoute path="/viewAlert/:id">
        <ViewAlertRoute />
      </DiscoverRoute>
      <DiscoverRoute path="/view/:id">
        <DiscoverMainRoute {...routeProps} />
      </DiscoverRoute>
      <DiscoverRoute path="/" exact>
        <DiscoverMainRoute {...routeProps} />
      </DiscoverRoute>
      <NotFoundRoute />
    </Routes>
  );
};

const DiscoverRoute = ({ children, ...props }: PropsWithChildren<RouteProps>) => {
  const { chrome, capabilities } = useDiscoverServices();

  useEffect(() => {
    const readOnlyBadge = getReadOnlyBadge({ capabilities });

    if (readOnlyBadge) {
      chrome.setBreadcrumbsBadges([readOnlyBadge]);
    }

    return () => {
      chrome.setBreadcrumbsBadges([]);
    };
  }, [capabilities, chrome, props.path]);

  return <Route {...props}>{children}</Route>;
};

export const getReadOnlyBadge = ({
  capabilities,
}: {
  capabilities: Capabilities;
}): ChromeBreadcrumbsBadge | undefined =>
  capabilities.discover_v2.save
    ? undefined
    : {
        badgeText: i18n.translate('discover.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        renderCustomBadge: ({ badgeText }) => {
          return (
            <EuiBetaBadge
              label={badgeText}
              tooltipContent={i18n.translate('discover.badge.readOnly.tooltip', {
                defaultMessage: 'Unable to save Discover sessions',
              })}
              color="hollow"
              iconType="glasses"
              data-test-subj="discover-readonly-badge"
              css={{ display: 'block' }}
            />
          );
        },
      };
