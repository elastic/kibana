/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { DataTableRecord, SHOW_MULTIFIELDS, getShouldShowFieldHandler } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { DocViewerGroupedTable } from '../../../doc_viewer_grouped_table/grouped_table';
import { HIDE_NULL_VALUES } from '../../../doc_viewer_table/table';
import { getAttributesTitle } from './get_attributes_title';

function getFilteredHit({
  startsWith,
  hit,
  searchTerm,
  hideNullValues,
  shouldShowFieldHandler,
}: {
  startsWith: string;
  hit: DataTableRecord;
  searchTerm: string;
  hideNullValues: boolean;
  shouldShowFieldHandler: (fieldName: string) => boolean;
}) {
  return {
    ...hit,
    flattened: Object.keys(hit.flattened).reduce<DataTableRecord['flattened']>((acc, key) => {
      if (!shouldShowFieldHandler(key)) {
        return acc;
      }
      if (!key.startsWith(startsWith)) {
        return acc;
      }

      if (searchTerm && !key.toLowerCase().includes(searchTerm.toLowerCase())) {
        return acc;
      }

      if (hideNullValues && hit.flattened[key] == null) {
        return acc;
      }

      acc[key] = hit.flattened[key];

      return acc;
    }, {}),
  };
}

export function AttributesOverview({
  columns,
  columnsMeta,
  hit,
  dataView,
  textBasedHits,
  filter,
  decreaseAvailableHeightBy,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [hideNullValues = false, setHideNullValues] = useLocalStorage(HIDE_NULL_VALUES, false);
  const { uiSettings } = getUnifiedDocViewerServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);

  const flattened = hit.flattened;

  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(flattened), dataView, showMultiFields),
    [flattened, dataView, showMultiFields]
  );

  const attributesGroups = useMemo(() => {
    return [
      {
        id: 'signal_attributes',
        title: getAttributesTitle(hit),
        tooltipMessage: i18n.translate(
          'unifiedDocViewer.docView.attributes.signalAttributesTooltip',
          {
            defaultMessage:
              'Metadata added by the instrumentation library to describe the telemetry data (e.g., HTTP method, user agent).',
          }
        ),
        hit: getFilteredHit({
          startsWith: 'attributes.',
          hit,
          searchTerm,
          hideNullValues,
          shouldShowFieldHandler,
        }),
      },
      {
        id: 'resource_attributes',
        title: i18n.translate('unifiedDocViewer.docView.attributes.resourceAttributesTitle', {
          defaultMessage: 'Resource attributes',
        }),
        tooltipMessage: i18n.translate(
          'unifiedDocViewer.docView.attributes.resourceAttributesTooltip',
          {
            defaultMessage:
              'Metadata originally set at the source of the telemetry, such as in the SDK or agent that generated the data.',
          }
        ),
        hit: getFilteredHit({
          startsWith: 'resource.attributes.',
          hit,
          searchTerm,
          hideNullValues,
          shouldShowFieldHandler,
        }),
      },
      {
        id: 'scope_attributes',
        title: i18n.translate('unifiedDocViewer.docView.attributes.scopeAttributesTitle', {
          defaultMessage: 'Scope attributes',
        }),
        tooltipMessage: i18n.translate(
          'unifiedDocViewer.docView.attributes.scopeAttributesTooltip',
          {
            defaultMessage:
              'Metadata associated with the instrumentation scope (i.e., the library/module that produced the telemetry), helping identify its origin and version.',
          }
        ),
        hit: getFilteredHit({
          startsWith: 'scope.attributes.',
          hit,
          searchTerm,
          hideNullValues,
          shouldShowFieldHandler,
        }),
      },
    ];
  }, [hit, searchTerm, hideNullValues, shouldShowFieldHandler]);

  return (
    <DocViewerGroupedTable
      columns={columns}
      columnsMeta={columnsMeta}
      hit={hit}
      dataView={dataView}
      textBasedHits={textBasedHits}
      filter={filter}
      decreaseAvailableHeightBy={decreaseAvailableHeightBy}
      onAddColumn={onAddColumn}
      onRemoveColumn={onRemoveColumn}
      groups={attributesGroups}
      searchTerm={searchTerm}
      onSearchTermChange={setSearchTerm}
      hideNullValues={hideNullValues}
      onHideNullValuesChange={setHideNullValues}
    />
  );
}
