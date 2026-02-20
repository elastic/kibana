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
  UnifiedDocViewerObservabilityAttributesOverview,
  UnifiedDocViewerServicesProvider,
  type UnifiedDocViewerContextualServices,
} from '@kbn/discover-contextual-components';
import { hasAnyFieldWithPrefixes } from '../../utils/has_any_field_with_prefixes';
import type { ObservabilityRootProfileProvider } from '../types';
import type { ProfileProviderServices } from '../../../profile_provider_services';

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

const attributesPrefixes = ['attributes.', 'scope.attributes.', 'resource.attributes.'];
const hasAnyAttributesField = hasAnyFieldWithPrefixes(attributesPrefixes);

export const createGetDocViewer =
  (
    services: ProfileProviderServices
  ): ObservabilityRootProfileProvider['profile']['getDocViewer'] =>
  (prev) =>
  (params) => {
    const prevDocViewer = prev(params);
    const tabTitle = i18n.translate('discover.docViews.observability.attributesOverview.title', {
      defaultMessage: 'Attributes',
    });

    return {
      ...prevDocViewer,
      docViewsRegistry: (registry) => {
        if (hasAnyAttributesField(params.record)) {
          registry.add({
            id: 'doc_view_obs_attributes_overview',
            title: tabTitle,
            order: 9,
            render: (props) => {
              return (
                <UnifiedDocViewerServicesProvider
                  services={getUnifiedDocViewerContextualServices(services)}
                >
                  <UnifiedDocViewerObservabilityAttributesOverview {...props} />
                </UnifiedDocViewerServicesProvider>
              );
            },
          });
        }

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
