/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense } from 'react';
import { CoreSetup, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiSkeletonText } from '@elastic/eui';
import { DocViewsRegistry, setDocViewsRegistry } from './services';
import { DeferredSpinner } from './components';
import { useUnifiedDocViewerServices } from './hooks/use_doc_view_services';

const DocViewerSource = React.lazy(() => import('./components/doc_viewer_source'));
const DocViewerTable = React.lazy(() => import('./components/doc_viewer_table'));
const DocViewerTableLegacy = React.lazy(() => import('./components/doc_viewer_table_legacy'));

export class UnifiedDocViewerPlugin implements Plugin<{}, {}> {
  private docViewsRegistry: DocViewsRegistry | null = null;

  public setup(coreSetup: CoreSetup) {
    this.docViewsRegistry = new DocViewsRegistry();
    setDocViewsRegistry(this.docViewsRegistry);

    this.docViewsRegistry.addDocView({
      title: i18n.translate('unifiedDocViewer.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: (props) => {
        // TODO: Get rid of this (move to stateful component)
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { uiSettings } = useUnifiedDocViewerServices();
        const DocView = uiSettings.get('doc_table:legacy') ? DocViewerTableLegacy : DocViewerTable;

        return (
          <Suspense
            fallback={
              <DeferredSpinner>
                <EuiSkeletonText />
              </DeferredSpinner>
            }
          >
            <DocView {...props} />
          </Suspense>
        );
      },
    });

    this.docViewsRegistry.addDocView({
      title: i18n.translate('unifiedDocViewer.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: ({ hit, dataView }) => {
        // TODO: Move these to the @kbn/unified-doc-viewer package
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { uiSettings } = useUnifiedDocViewerServices();
        const useDocExplorer = !uiSettings.get('doc_table:legacy');
        const useNewFieldsApi = !uiSettings.get('discover:searchFieldsFromSource');

        return (
          <Suspense
            fallback={
              <DeferredSpinner>
                <EuiSkeletonText />
              </DeferredSpinner>
            }
          >
            <DocViewerSource
              index={hit.raw._index}
              id={hit.raw._id}
              dataView={dataView}
              hasLineNumbers
              useDocExplorer={useDocExplorer}
              useNewFieldsApi={useNewFieldsApi}
            />
          </Suspense>
        );
      },
    });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
