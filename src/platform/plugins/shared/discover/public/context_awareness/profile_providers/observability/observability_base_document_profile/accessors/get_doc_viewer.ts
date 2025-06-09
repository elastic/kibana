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
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import type { DocViewerExtension, DocViewerExtensionParams } from '../../../../types';
import type { DocumentProfileProvider } from '../../../../profiles';
import type { ProfileProviderServices } from '../../../profile_provider_services';

export const createGetDocViewer =
  (services: ProfileProviderServices): DocumentProfileProvider['profile']['getDocViewer'] =>
  (prev: (params: DocViewerExtensionParams) => DocViewerExtension) =>
  (params: DocViewerExtensionParams) => {
    const prevDocViewer = prev(params);
    console.log('[BASE] This is the Document profile viewer ', services);
    return {
      ...prevDocViewer,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        registry.add({
          id: 'doc_view_obs_attributes_overview',
          title: i18n.translate('discover.docViews.observability.attributesOverview.title', {
            defaultMessage: 'Attributes',
          }),
          order: 0,
          component: (props) => {
            return 'Attributes Overview';
          },
        });

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
