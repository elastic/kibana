/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDocViewerObservabilityGenericOverview,
  UnifiedDocViewerServicesProvider,
  type UnifiedDocViewerContextualServices,
} from '@kbn/discover-contextual-components';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { ObservabilityIndexes } from '@kbn/discover-utils';
import type { DocumentProfileProvider } from '../../../../../profiles';
import type { DocViewerExtensionParams, DocViewerExtension } from '../../../../../types';
import type { ProfileProviderServices } from '../../../../profile_provider_services';

const getUnifiedDocViewerContextualServices = (
  services: ProfileProviderServices
): UnifiedDocViewerContextualServices => ({
  analytics: services.analytics,
  data: services.data,
  fieldFormats: services.fieldFormats,
  fieldsMetadata: services.fieldsMetadata,
  toasts: services.core.notifications.toasts,
  storage: services.storage,
  uiSettings: services.uiSettings,
  share: services.share,
  core: services.core,
  discoverShared: services.discoverShared,
});

export const createGetDocViewer =
  (
    services: ProfileProviderServices,
    indexes: ObservabilityIndexes
  ): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev: (params: DocViewerExtensionParams) => DocViewerExtension) =>
  (params: DocViewerExtensionParams) => {
    const prevDocViewer = prev(params);
    const tabTitle = i18n.translate('discover.docViews.observability.generic.overview.title', {
      defaultMessage: 'Overview',
    });
    return {
      ...prevDocViewer,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        registry.add({
          id: 'doc_view_obs_generic_overview',
          title: tabTitle,
          order: 0,
          render: (props) => (
            <UnifiedDocViewerServicesProvider
              services={getUnifiedDocViewerContextualServices(services)}
            >
              <UnifiedDocViewerObservabilityGenericOverview
                {...props}
                indexes={indexes}
                docViewActions={params.actions}
              />
            </UnifiedDocViewerServicesProvider>
          ),
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
