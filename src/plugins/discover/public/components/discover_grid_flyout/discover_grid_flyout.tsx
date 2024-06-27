/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { dynamic } from '@kbn/shared-ux-utility';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { EuiDelayRender, EuiSkeletonText } from '@elastic/eui';
import { Filter, Query, AggregateQuery, isOfAggregateQueryType } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import type { DataTableColumnsMeta } from '@kbn/unified-data-table';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { UnifiedDocViewerFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import { canImportVisContext } from '@kbn/unified-histogram-plugin/public';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useFlyoutActions } from './use_flyout_actions';
import { useDiscoverCustomization } from '../../customizations';
import { DiscoverGridFlyoutActions } from './discover_grid_flyout_actions';
import { useProfileAccessor } from '../../context_awareness';
import { DocViewerAnnotationContext } from './doc_viewer_annotation/doc_viewer_annotation_context';
import {
  useSavedSearch,
  useSavedSearchContainer,
} from '../../application/main/state_management/discover_state_provider';

const LazyDocViewerAnnotation = dynamic(() => import('./doc_viewer_annotation'), {
  fallback: (
    <EuiDelayRender delay={300}>
      <EuiSkeletonText />
    </EuiDelayRender>
  ),
});

export const FLYOUT_WIDTH_KEY = 'discover:flyoutWidth';

export interface DiscoverGridFlyoutProps {
  savedSearchId?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter?: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}

/**
 * Flyout displaying an expanded Elasticsearch document
 */
export function DiscoverGridFlyout({
  hit,
  hits,
  dataView,
  columns,
  columnsMeta,
  savedSearchId,
  filters,
  query,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  setExpandedDoc,
}: DiscoverGridFlyoutProps) {
  const services = useDiscoverServices();
  const flyoutCustomization = useDiscoverCustomization('flyout');
  const isESQLQuery = isOfAggregateQueryType(query);
  // Get actual hit with updated highlighted searches
  const actualHit = useMemo(() => hits?.find(({ id }) => id === hit?.id) || hit, [hit, hits]);

  const [docVisAnnotation, setDocVisAnnotation] = useState<EventAnnotationConfig>();
  const savedSearchState = useSavedSearch();
  const savedSearchContainer = useSavedSearchContainer();

  const updateVisAnnotation = useCallback(
    (annotation: EventAnnotationConfig | undefined) => {
      setDocVisAnnotation(annotation);

      const visContext =
        isESQLQuery && canImportVisContext(savedSearchState?.visContext)
          ? savedSearchState?.visContext
          : undefined;
      if (visContext) {
        let layers = visContext.attributes.state.visualization.layers || [];
        let annotationsLayer = layers.find((layer) => layer.layerType === 'annotations');

        if (annotationsLayer) {
          layers = layers.filter((layer) => layer.layerId !== annotationsLayer.layerId);
        } else {
          annotationsLayer = {
            layerId: uuidv4(),
            layerType: 'annotations',
            annotations: [],
            ignoreGlobalFilters: true,
            persistanceType: 'byValue',
            indexPatternId: dataView.id,
          };
        }

        const nextVisContext = {
          ...visContext,
          attributes: {
            ...visContext.attributes,
            state: {
              ...visContext.attributes.state,
              visualization: {
                ...visContext.attributes.state.visualization,
                layers: [
                  ...layers,
                  {
                    ...annotationsLayer,
                    indexPatternId: dataView.id,
                    annotations: [
                      ...(annotationsLayer.annotations || []).filter(
                        (a: EventAnnotationConfig) => a.id !== annotation?.id
                      ),
                      ...(annotation ? [annotation] : []),
                    ],
                  },
                ],
              },
            },
          },
        };

        savedSearchContainer.updateVisContext({
          nextVisContext,
        });
      }
    },
    [
      setDocVisAnnotation,
      isESQLQuery,
      savedSearchState?.visContext,
      savedSearchContainer,
      dataView.id,
    ]
  );

  const { flyoutActions } = useFlyoutActions({
    actions: flyoutCustomization?.actions,
    dataView,
    rowIndex: actualHit.raw._index,
    rowId: actualHit.raw._id,
    columns,
    filters,
    savedSearchId,
  });

  const getDocViewerAccessor = useProfileAccessor('getDocViewer', {
    record: actualHit,
  });
  const docViewer = useMemo(() => {
    const getDocViewer = getDocViewerAccessor(() => ({
      title: flyoutCustomization?.title,
      docViewsRegistry: (registry: DocViewsRegistry) => {
        const derivedRegistry =
          typeof flyoutCustomization?.docViewsRegistry === 'function'
            ? flyoutCustomization.docViewsRegistry(registry)
            : registry;

        derivedRegistry.add({
          id: 'doc_view_annotation',
          title: i18n.translate('unifiedDocViewer.docViews.docVisAnnotation.title', {
            defaultMessage: 'Annotation',
          }),
          order: 100,
          component: (props) => {
            return <LazyDocViewerAnnotation {...props} />;
          },
        });

        return derivedRegistry;
      },
    }));

    return getDocViewer({ record: actualHit });
  }, [flyoutCustomization, getDocViewerAccessor, actualHit]);

  const docViewerAnnotationContextValue = useMemo(() => {
    return {
      docVisAnnotation,
      onDocVisAnnotationChanged: updateVisAnnotation,
    };
  }, [docVisAnnotation, updateVisAnnotation]);

  return (
    <DocViewerAnnotationContext.Provider value={docViewerAnnotationContextValue}>
      <UnifiedDocViewerFlyout
        flyoutTitle={docViewer.title}
        flyoutDefaultWidth={flyoutCustomization?.size}
        flyoutActions={
          !isESQLQuery && flyoutActions.length > 0 ? (
            <DiscoverGridFlyoutActions flyoutActions={flyoutActions} />
          ) : null
        }
        flyoutWidthLocalStorageKey={FLYOUT_WIDTH_KEY}
        FlyoutCustomBody={flyoutCustomization?.Content}
        services={services}
        docViewsRegistry={docViewer.docViewsRegistry}
        isEsqlQuery={isESQLQuery}
        hit={hit}
        hits={hits}
        dataView={dataView}
        columns={columns}
        columnsMeta={columnsMeta}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
        onClose={onClose}
        onFilter={onFilter}
        setExpandedDoc={setExpandedDoc}
      />
    </DocViewerAnnotationContext.Provider>
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverGridFlyout;
