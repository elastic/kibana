/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreSetup, Plugin } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { createGetterSetter, Storage } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import type { UnifiedDocViewerServices } from './types';

export const [getUnifiedDocViewerServices, setUnifiedDocViewerServices] =
  createGetterSetter<UnifiedDocViewerServices>('UnifiedDocViewerServices');

const fallback = (
  <EuiDelayRender delay={300}>
    <EuiSkeletonText />
  </EuiDelayRender>
);

const LazyDocViewerTable = dynamic(() => import('./components/doc_viewer_table'), { fallback });
const LazySourceViewer = dynamic(() => import('./components/doc_viewer_source'), { fallback });

export interface UnifiedDocViewerSetup {
  registry: DocViewsRegistry;
}

export interface UnifiedDocViewerStart {
  registry: DocViewsRegistry;
}

export interface UnifiedDocViewerStartDeps {
  data: DataPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  fieldsMetadata: FieldsMetadataPublicStart;
  share: SharePluginStart;
  discoverShared: DiscoverSharedPublicStart;
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
      render: (props) => {
        return <LazyDocViewerTable {...props} />;
      },
    });

    this.docViewsRegistry.add({
      id: 'doc_view_source',
      title: i18n.translate('unifiedDocViewer.docViews.json.jsonTitle', {
        defaultMessage: 'JSON',
      }),
      order: 20,
      render: ({ hit, dataView, textBasedHits, decreaseAvailableHeightBy }) => {
        return (
          <LazySourceViewer
            index={hit.raw._index}
            id={hit.raw._id ?? hit.id}
            dataView={dataView}
            // If ES|QL query changes, then textBasedHits will update too.
            // This is a workaround to reuse the previously referred hit
            // so the doc viewer preserves the state even after the record disappears from hits list.
            esqlHit={Array.isArray(textBasedHits) ? hit : undefined}
            decreaseAvailableHeightBy={decreaseAvailableHeightBy}
            onRefresh={() => {}}
          />
        );
      },
    });

    return {
      registry: this.docViewsRegistry,
    };
  }

  public start(core: CoreStart, deps: UnifiedDocViewerStartDeps) {
    const {
      analytics,
      uiSettings,
      notifications: { toasts },
    } = core;
    const { data, fieldFormats, fieldsMetadata, share, discoverShared } = deps;
    const storage = new Storage(localStorage);
    const unifiedDocViewer = {
      registry: this.docViewsRegistry,
    };
    const services = {
      analytics,
      data,
      fieldFormats,
      fieldsMetadata,
      toasts,
      storage,
      uiSettings,
      unifiedDocViewer,
      share,
      core,
      discoverShared,
    };
    setUnifiedDocViewerServices(services);
    return unifiedDocViewer;
  }
}
