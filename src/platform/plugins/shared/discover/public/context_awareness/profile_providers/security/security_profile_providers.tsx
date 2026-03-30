/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EnhancedAlertEventOverviewLazy, EnhancedAlertFlyoutHeaderLazy } from './components';
import { SECURITY_PROFILE_ID } from './constants';
import { extendProfileProvider } from '../extend_profile_provider';
import { createSecurityDocumentProfileProvider } from './security_document_profile';
import type { ProfileProviderServices } from '../profile_provider_services';
import * as i18n from './translations';
import { isAlertDocument, isEventDocument } from './utils/is_alert_document';

export const createSecurityDocumentProfileProviders = (
  providerServices: ProfileProviderServices
) => {
  const baseProvider = createSecurityDocumentProfileProvider(providerServices);
  const enhancedProvider = extendProfileProvider(baseProvider, {
    profileId: SECURITY_PROFILE_ID.enhanced_document,
    isExperimental: true,
    profile: {
      getDocViewer: (prev) => (params) => {
        const prevDocViewer = prev(params);
        const isAlert = isAlertDocument(params.record);
        const isEvent = isEventDocument(params.record);

        return {
          ...prevDocViewer,
          renderHeader:
            isAlert || isEvent
              ? (props) => (
                  <EnhancedAlertFlyoutHeaderLazy
                    {...props}
                    providerServices={providerServices}
                    fallbackRenderHeader={prevDocViewer.renderHeader}
                  />
                )
              : prevDocViewer.renderHeader,
          docViewsRegistry: (registry) => {
            if (isAlert || isEvent) {
              registry.add({
                id: 'doc_view_alerts_overview',
                title: i18n.overviewTabTitle(isAlert),
                order: 0,
                render: (props) => (
                  <EnhancedAlertEventOverviewLazy {...props} providerServices={providerServices} />
                ),
              });
            }

            return prevDocViewer.docViewsRegistry(registry);
          },
        };
      },
    },
  });
  return [enhancedProvider, baseProvider];
};
