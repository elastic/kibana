/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { Plugin } from '@kbn/core/public';
import { DOC_TABLE_LEGACY } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import { DeferredSpinner, DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { EuiSkeletonText } from '@elastic/eui';
import { useUnifiedDocViewerServices } from './hooks';

const DocViewerLegacyTable = React.lazy(() => import('./components/doc_viewer_table/legacy'));
const DocViewerTable = React.lazy(() => import('./components/doc_viewer_table'));
const SourceViewer = React.lazy(() => import('./components/doc_viewer_source'));

export const [getDocViewsRegistry, setDocViewsRegistry] =
  createGetterSetter<DocViewsRegistry>('DocViewsRegistry');

export class UnifiedDocViewerPublicPlugin implements Plugin<{}, {}, object, {}> {
  private docViewsRegistry: DocViewsRegistry | null = null;

  public setup() {
    this.docViewsRegistry = new DocViewsRegistry();
    setDocViewsRegistry(this.docViewsRegistry);

    this.docViewsRegistry.addDocView({
      title: i18n.translate('unifiedDocViewer.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: (props) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const services = useUnifiedDocViewerServices();
        const DocView = services.uiSettings.get(DOC_TABLE_LEGACY)
          ? DocViewerLegacyTable
          : DocViewerTable;

        return withSuspense(
          DocView,
          <DeferredSpinner>
            <EuiSkeletonText />
          </DeferredSpinner>
        )(props);
      },
    });
    this.docViewsRegistry.addDocView({
      title: i18n.translate('unifiedDocViewer.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: ({ hit, dataView, query, textBasedHits }) => {
        return (
          <React.Suspense
            fallback={
              <DeferredSpinner>
                <EuiSkeletonText />
              </DeferredSpinner>
            }
          >
            <SourceViewer
              index={hit.raw._index}
              id={hit.raw._id ?? hit.id}
              dataView={dataView}
              textBasedHits={textBasedHits}
              hasLineNumbers
              onRefresh={() => {}}
            />
          </React.Suspense>
        );
      },
    });

    return {
      docViews: {
        addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
      },
    };
  }

  public start() {
    return {};
  }
}
