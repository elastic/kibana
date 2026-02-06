/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import type { DocumentProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

/**
 * Creates doc viewer with Alert/Event Overview tab
 * Shows different title based on whether document is an alert or event
 */
export const createGetDocViewer =
  (services: ProfileProviderServices): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev) =>
  (params) => {
    const prevDocViewer = prev(params);
    const isAlert = params.context?.isAlert;

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry) => {
        // Add security overview tab
        registry.add({
          id: 'security_overview',
          title: isAlert
            ? i18n.translate('discover.universalSecurityProfile.docViewer.alertOverviewTitle', {
                defaultMessage: 'Alert Overview',
              })
            : i18n.translate('discover.universalSecurityProfile.docViewer.eventOverviewTitle', {
                defaultMessage: 'Event Overview',
              }),
          order: 0,
          render: () => (
            <div style={{ padding: 16 }}>
              {isAlert ? (
                <p>Alert overview (placeholder - to be implemented)</p>
              ) : (
                <p>Event overview (placeholder - to be implemented)</p>
              )}
            </div>
          ),
        });

        // Apply previous doc viewer registry modifications
        return prevDocViewer.docViewsRegistry
          ? prevDocViewer.docViewsRegistry(registry)
          : registry;
      },
    };
  };
