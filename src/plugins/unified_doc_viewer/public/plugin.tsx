/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import { isLegacyTableEnabled } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { createGetterSetter, Storage } from '@kbn/kibana-utils-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { CoreStart } from '@kbn/core/public';
import type { UnifiedDocViewerServices } from './types';

export const [getUnifiedDocViewerServices, setUnifiedDocViewerServices] =
  createGetterSetter<UnifiedDocViewerServices>('UnifiedDocViewerServices');

const DocViewerLegacyTable = React.lazy(() => import('./components/doc_viewer_table/legacy'));
const DocViewerTable = React.lazy(() => import('./components/doc_viewer_table'));
const SourceViewer = React.lazy(() => import('./components/doc_viewer_source'));

export interface UnifiedDocViewerSetup {
  registry: DocViewsRegistry;
}

export interface UnifiedDocViewerStart {
  registry: DocViewsRegistry;
}

export interface UnifiedDocViewerStartDeps {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
}

export class UnifiedDocViewerPublicPlugin
  implements Plugin<UnifiedDocViewerSetup, UnifiedDocViewerStart, {}, UnifiedDocViewerStartDeps>
{
  private docViewsRegistry = new DocViewsRegistry();

  public setup(core: CoreSetup<UnifiedDocViewerStartDeps, UnifiedDocViewerStart>) {
    this.docViewsRegistry.add({
      id: 'doc_view_table',
      title: i18n.translate('unifiedDocViewer.docViews.table.tableTitle', {
        defaultMessage: 'Table',
      }),
      order: 10,
      component: (props) => {
        const { textBasedHits } = props;
        const { uiSettings } = getUnifiedDocViewerServices();
        const DocView = isLegacyTableEnabled({
          uiSettings,
          isTextBasedQueryMode: Array.isArray(textBasedHits),
        })
          ? DocViewerLegacyTable
          : DocViewerTable;

        return (
          <React.Suspense
            fallback={
              <EuiDelayRender delay={300}>
                <EuiSkeletonText />
              </EuiDelayRender>
            }
          >
            <DocView {...props} />
          </React.Suspense>
        );
      },
    });

    this.docViewsRegistry.add({
      id: 'doc_view_source',
      title: i18n.translate('unifiedDocViewer.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      component: ({ hit, dataView, textBasedHits }) => {
        return (
          <React.Suspense
            fallback={
              <EuiDelayRender delay={300}>
                <EuiSkeletonText />
              </EuiDelayRender>
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
      registry: this.docViewsRegistry,
    };
  }

  public start(core: CoreStart, deps: UnifiedDocViewerStartDeps) {
    const { analytics, uiSettings } = core;
    const { data, fieldFormats } = deps;
    const storage = new Storage(localStorage);
    const unifiedDocViewer = {
      registry: this.docViewsRegistry,
    };
    const services = { analytics, data, fieldFormats, storage, uiSettings, unifiedDocViewer };
    setUnifiedDocViewerServices(services);
    return unifiedDocViewer;
  }
}
