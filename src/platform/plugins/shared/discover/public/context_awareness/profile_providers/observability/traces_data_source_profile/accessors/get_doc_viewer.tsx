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
import { DATASTREAM_TYPE_FIELD, PROCESSOR_EVENT_FIELD, getFieldValue } from '@kbn/discover-utils';
import { DocViewerExtensionParams, DocViewerExtension } from '../../../../types';

export const getDocViewer =
  (prev: (params: DocViewerExtensionParams) => DocViewerExtension) =>
  (params: DocViewerExtensionParams) => {
    const prevValue = prev(params);
    const isTrace = getFieldValue(params.record, DATASTREAM_TYPE_FIELD) === 'traces';

    if (!isTrace) {
      return prevValue;
    }
    const processorEvent = getFieldValue(params.record, PROCESSOR_EVENT_FIELD);

    const documentType =
      processorEvent === 'span'
        ? i18n.translate('discover.docViews.tracesOverview.spanTitle', {
            defaultMessage: 'Span',
          })
        : i18n.translate('discover.docViews.tracesOverview.transactionTitle', {
            defaultMessage: 'Transaction',
          });

    return {
      ...prevValue,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        registry.add({
          id: 'doc_view_traces_overview',
          title: i18n.translate('discover.docViews.tracesOverview.title', {
            defaultMessage: '{documentType} overview',
            values: { documentType },
          }),
          order: 0,
          component: (props) => {
            return <UnifiedDocViewerTracesOverview {...props} />;
          },
        });

        return prevValue.docViewsRegistry(registry);
      },
    };
  };
