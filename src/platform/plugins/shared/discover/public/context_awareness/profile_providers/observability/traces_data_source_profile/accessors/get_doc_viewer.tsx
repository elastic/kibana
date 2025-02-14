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
import { UnifiedDocViewerTracesOverview } from '@kbn/unified-doc-viewer-plugin/public';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DATASTREAM_TYPE_FIELD } from '@kbn/discover-utils';
import { DocViewerExtensionParams, DocViewerExtension } from '../../../../types';

export const getDocViewer =
  (prev: (params: DocViewerExtensionParams) => DocViewerExtension) =>
  (params: DocViewerExtensionParams) => {
    const recordId = params.record.id;
    const prevValue = prev(params);
    const dataStreamTypes = params.record.flattened[DATASTREAM_TYPE_FIELD];
    const dataStreamType = Array.isArray(dataStreamTypes) ? dataStreamTypes[0] : dataStreamTypes;

    const isTrace = dataStreamType === 'traces';
    if (!isTrace) {
      return {
        title: `Record #${recordId}`,
        docViewsRegistry: (registry: DocViewsRegistry) => registry,
      };
    }
    const parentId = params.record.flattened['parent.id'];
    const documentName = parentId ? 'Span' : 'Transaction';

    return {
      title: `Record #${recordId}`,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        registry.add({
          id: 'doc_view_overview',
          title: `${documentName} ${i18n.translate('discover.docViews.tracesOverview.title', {
            defaultMessage: 'Overview',
          })}`,
          order: 0,
          component: (
            props: React.JSX.IntrinsicAttributes & DocViewRenderProps & React.RefAttributes<{}>
          ) => {
            return <UnifiedDocViewerTracesOverview {...props} />;
          },
        });

        return prevValue.docViewsRegistry(registry);
      },
    };
  };
