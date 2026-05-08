/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EnhancedAlertEventOverviewLazy,
  EnhancedAlertFlyoutFooterLazy,
  EnhancedAlertFlyoutHeaderLazy,
  EnhancedIOCFlyoutFooterLazy,
  EnhancedIOCFlyoutHeaderLazy,
  EnhancedIOCOverviewLazy,
} from './components';
import { SECURITY_PROFILE_ID } from './constants';
import { extendProfileProvider } from '../extend_profile_provider';
import { createSecurityDocumentProfileProvider } from './security_document_profile';
import type { ProfileProviderServices } from '../profile_provider_services';
import * as i18n from './translations';
import { isAlertDocument, isEventDocument, isIOCDocument } from './utils/is_alert_document';

export const createSecurityDocumentProfileProviders = (
  providerServices: ProfileProviderServices
) => {
  const baseProvider = createSecurityDocumentProfileProvider(providerServices);
  const enhancedProvider = extendProfileProvider(baseProvider, {
    profileId: SECURITY_PROFILE_ID.enhanced_document,
    profile: {
      getDocViewer: (prev) => (params) => {
        const prevDocViewer = prev(params);
        const isAlert = isAlertDocument(params.record);
        const isEvent = isEventDocument(params.record);
        const isIOC = isIOCDocument(params.record);

        let renderFooter = prevDocViewer.renderFooter;
        if (isIOC) {
          renderFooter = (props) => (
            <EnhancedIOCFlyoutFooterLazy
              {...props}
              providerServices={providerServices}
              fallbackRenderFooter={prevDocViewer.renderFooter}
            />
          );
        } else if (isAlert || isEvent) {
          renderFooter = (props) => (
            <EnhancedAlertFlyoutFooterLazy
              {...props}
              fallbackRenderFooter={prevDocViewer.renderFooter}
              providerServices={providerServices}
              refreshData={params.actions.refreshData}
            />
          );
        }

        let renderHeader = prevDocViewer.renderHeader;
        if (isIOC) {
          renderHeader = (props) => (
            <EnhancedIOCFlyoutHeaderLazy
              {...props}
              providerServices={providerServices}
              fallbackRenderHeader={prevDocViewer.renderHeader}
            />
          );
        } else if (isAlert || isEvent) {
          renderHeader = (props) => (
            <EnhancedAlertFlyoutHeaderLazy
              {...props}
              fallbackRenderHeader={prevDocViewer.renderHeader}
              providerServices={providerServices}
              refreshData={params.actions.refreshData}
            />
          );
        }

        return {
          ...prevDocViewer,
          renderHeader,
          docViewsRegistry: (registry) => {
            if (isIOC) {
              registry.add({
                id: 'doc_view_ioc_overview',
                title: i18n.iocOverviewTabTitle,
                order: 0,
                render: (props) => (
                  <EnhancedIOCOverviewLazy {...props} providerServices={providerServices} />
                ),
              });
            } else if (isAlert || isEvent) {
              registry.add({
                id: 'doc_view_alerts_overview',
                title: i18n.overviewTabTitle(isAlert),
                order: 0,
                render: (props) => (
                  <EnhancedAlertEventOverviewLazy
                    {...props}
                    providerServices={providerServices}
                    refreshData={params.actions.refreshData}
                  />
                ),
              });
            }

            return prevDocViewer.docViewsRegistry(registry);
          },
          renderFooter,
        };
      },
    },
  });
  return [enhancedProvider, baseProvider];
};
