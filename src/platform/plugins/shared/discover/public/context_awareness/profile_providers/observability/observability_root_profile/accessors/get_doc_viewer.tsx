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
import { UnifiedDocViewerObservabilityAttributesOverview } from '@kbn/unified-doc-viewer-plugin/public';
import { hasAnyFieldWithPrefixes } from '../../utils/has_any_field_with_prefixes';
import type { ObservabilityRootProfileProvider } from '../types';

const attributesPrefixes = ['attributes.', 'scope.attributes.', 'resource.attributes.'];
const hasAnyAttributesField = hasAnyFieldWithPrefixes(attributesPrefixes);

export const getDocViewer: ObservabilityRootProfileProvider['profile']['getDocViewer'] =
  (prev) => (params) => {
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
              return <UnifiedDocViewerObservabilityAttributesOverview {...props} />;
            },
          });
        }

        return prevDocViewer.docViewsRegistry(registry);
      },
    };
  };
