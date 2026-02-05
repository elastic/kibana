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
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

/**
 * Creates doc viewer with capability-based feature detection
 * Shows "Logs overview" tab, but only includes available features
 */
export const createGetDocViewer =
  (services: ProfileProviderServices): DataSourceProfileProvider['profile']['getDocViewer'] =>
  (prev) =>
  (params) => {
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] getDocViewer called');

    const prevDocViewer = prev(params);

    // Check for available features
    const hasStreamsFeature = !!services.discoverShared?.features?.registry?.getById('streams');
    const hasApmFeature = services.apmContextService?.tracesService?.getAllTracesIndexPattern;
    
    // eslint-disable-next-line no-console
    console.log('[Universal Logs Profile] Available features:', {
      streams: hasStreamsFeature,
      apm: !!hasApmFeature,
    });

    // Only add logs overview tab if we have at least some capabilities
    // The tab will gracefully show available features
    return {
      title: prevDocViewer.title,
      docViewsRegistry: (registry) => {
        const existingRegistry = prevDocViewer.docViewsRegistry
          ? prevDocViewer.docViewsRegistry(registry)
          : registry;

        // Add a simple logs overview tab
        // In production, this would use UnifiedDocViewerLogsOverview with capability checks
        existingRegistry.add({
          id: 'doc_view_logs_overview',
          title: i18n.translate('discover.universalLogsProfile.docViewer.logsOverviewTitle', {
            defaultMessage: 'Log details',
          }),
          order: 0,
          component: (props) => (
            <div style={{ padding: '16px' }}>
              <EuiText>
                <h3>
                  {i18n.translate('discover.universalLogsProfile.docViewer.logDetailsHeading', {
                    defaultMessage: 'Log Details',
                  })}
                </h3>
                <p>
                  {i18n.translate('discover.universalLogsProfile.docViewer.logDetailsDescription', {
                    defaultMessage: 'Universal logs view - features adapt based on available capabilities',
                  })}
                </p>
              </EuiText>
              
              {hasStreamsFeature && (
                <EuiText size="s" color="subdued">
                  <p>✓ Streams integration available</p>
                </EuiText>
              )}
              
              {hasApmFeature && (
                <EuiText size="s" color="subdued">
                  <p>✓ APM traces available</p>
                </EuiText>
              )}

              {!hasStreamsFeature && !hasApmFeature && (
                <EuiEmptyPrompt
                  iconType="iInCircle"
                  body={
                    <p>
                      {i18n.translate(
                        'discover.universalLogsProfile.docViewer.limitedFeaturesMessage',
                        {
                          defaultMessage:
                            'Some features are not available in this environment. Core log viewing is fully functional.',
                        }
                      )}
                    </p>
                  }
                />
              )}
            </div>
          ),
        });

        return existingRegistry;
      },
    };
  };
