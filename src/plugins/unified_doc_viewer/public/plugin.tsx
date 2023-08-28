/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import { DOC_TABLE_LEGACY } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { DeferredSpinner, DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { EuiSkeletonText } from '@elastic/eui';
import { createGetterSetter, Storage } from '@kbn/kibana-utils-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { type UnifiedDocViewerServices, useUnifiedDocViewerServices } from './hooks';

export const [getUnifiedDocViewerServices, setUnifiedDocViewerServices] = createGetterSetter<
  Promise<UnifiedDocViewerServices>
>('UnifiedDocViewerServices');

const DocViewerLegacyTable = React.lazy(() => import('./components/doc_viewer_table/legacy'));
const DocViewerTable = React.lazy(() => import('./components/doc_viewer_table'));
const SourceViewer = React.lazy(() => import('./components/doc_viewer_source'));

export interface UnifiedDocViewerSetup {
  addDocView: DocViewsRegistry['addDocView'];
}

export interface UnifiedDocViewerStart {
  getDocViews: DocViewsRegistry['getDocViewsSorted'];
}

export interface UnifiedDocViewerStartDeps {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

export class UnifiedDocViewerPublicPlugin
  implements Plugin<UnifiedDocViewerSetup, UnifiedDocViewerStart, UnifiedDocViewerStartDeps>
{
  private docViewsRegistry = new DocViewsRegistry();

  public setup(core: CoreSetup<UnifiedDocViewerStartDeps, UnifiedDocViewerStart>) {
    this.docViewsRegistry.addDocView({
      title: i18n.translate('unifiedDocViewer.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: (props) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const { uiSettings } = useUnifiedDocViewerServices();
        const DocView = uiSettings.get(DOC_TABLE_LEGACY) ? DocViewerLegacyTable : DocViewerTable;

        return (
          <React.Suspense
            fallback={
              <DeferredSpinner>
                <EuiSkeletonText />
              </DeferredSpinner>
            }
          >
            <DocView {...props} />
          </React.Suspense>
        );
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

    const { analytics, uiSettings } = core;
    setUnifiedDocViewerServices(
      core.getStartServices().then(([, depsStart, unifiedDocViewer]) => {
        const { data, fieldFormats } = depsStart;
        const storage = new Storage(localStorage);
        return {
          analytics,
          data,
          fieldFormats,
          storage,
          uiSettings,
          unifiedDocViewer,
        };
      })
    );

    return {
      addDocView: this.docViewsRegistry.addDocView.bind(this.docViewsRegistry),
    };
  }

  public start() {
    return {
      getDocViews: this.docViewsRegistry.getDocViewsSorted.bind(this.docViewsRegistry),
    };
  }
}
