/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useMemo, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { EuiSpacer, EuiFieldSearch, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  LOCAL_STORAGE_KEY_SEARCH_TERM,
  useTableFilters,
} from '../../../doc_viewer_table/table_filters';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../../../doc_viewer_source/get_height';
import { AttributesAccordion } from './attributes_accordion';
import { getDataStreamType } from './get_data_stream_type';

export function AttributesOverview({
  columns,
  columnsMeta,
  hit,
  dataView,
  filter,
  decreaseAvailableHeightBy,
  onAddColumn,
  onRemoveColumn,
}: DocViewRenderProps) {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { storage } = getUnifiedDocViewerServices();
  const { searchTerm, onChangeSearchTerm } = useTableFilters({
    storage,
    storageKey: LOCAL_STORAGE_KEY_SEARCH_TERM,
  });

  const flattened = hit.flattened || {};

  const signalType = getDataStreamType(hit);

  let attributesTitle: string;
  switch (signalType) {
    case 'logs':
      attributesTitle = i18n.translate(
        'unifiedDocViewer.docView.attributes.signalAttributesTitle.logs',
        {
          defaultMessage: 'Log attributes',
        }
      );
      break;
    case 'metrics':
      attributesTitle = i18n.translate(
        'unifiedDocViewer.docView.attributes.signalAttributesTitle.metrics',
        {
          defaultMessage: 'Metric attributes',
        }
      );
      break;
    case 'traces':
      attributesTitle = i18n.translate(
        'unifiedDocViewer.docView.attributes.signalAttributesTitle.traces',
        {
          defaultMessage: 'Span attributes',
        }
      );
      break;
    default:
      attributesTitle = i18n.translate(
        'unifiedDocViewer.docView.attributes.signalAttributesTitle.default',
        {
          defaultMessage: 'Attributes',
        }
      );
  }

  const allFields = Object.keys(flattened);

  const attributesFields = useMemo(
    () =>
      allFields.filter(
        (name) =>
          name.startsWith('attributes.') &&
          !name.startsWith('resource.attributes.') &&
          !name.startsWith('scope.attributes.') &&
          name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [allFields, searchTerm]
  );
  const resourceAttributesFields = useMemo(
    () =>
      allFields.filter(
        (name) =>
          name.startsWith('resource.attributes.') &&
          name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [allFields, searchTerm]
  );
  const scopeAttributesFields = useMemo(
    () =>
      allFields.filter(
        (name) =>
          name.startsWith('scope.attributes.') &&
          name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [allFields, searchTerm]
  );

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM)
    : 0;

  return (
    <EuiFlexGroup
      ref={setContainerRef}
      direction="column"
      gutterSize="none"
      responsive={false}
      css={
        containerHeight
          ? css`
              height: ${containerHeight}px;
              overflow: hidden;
            `
          : css`
              display: block;
            `
      }
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFieldSearch
          aria-label={i18n.translate('unifiedDocViewer.docView.attributes.searchAriaLabel', {
            defaultMessage: 'Search attributes names or values',
          })}
          placeholder={i18n.translate('unifiedDocViewer.docView.attributes.placeholder', {
            defaultMessage: 'Search attributes names or values',
          })}
          value={searchTerm}
          onChange={(e) => onChangeSearchTerm(e.target.value)}
          fullWidth
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
      </EuiFlexItem>
      <EuiFlexItem
        grow={true}
        css={css`
          overflow: auto;
        `}
      >
        <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
          <EuiFlexItem grow={false}>
            <AttributesAccordion
              id="signal_attributes"
              title={attributesTitle}
              ariaLabel={attributesTitle}
              fields={attributesFields}
              hit={hit}
              dataView={dataView}
              columns={columns}
              columnsMeta={columnsMeta}
              searchTerm={searchTerm}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
              filter={filter}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AttributesAccordion
              id="resource_attributes"
              title={i18n.translate('unifiedDocViewer.docView.attributes.resourceAttributesTitle', {
                defaultMessage: 'Resource attributes',
              })}
              ariaLabel={i18n.translate(
                'unifiedDocViewer.docView.attributes.resourceAttributesTitle.ariaLabel',
                { defaultMessage: 'Resource attributes' }
              )}
              fields={resourceAttributesFields}
              hit={hit}
              dataView={dataView}
              columns={columns}
              columnsMeta={columnsMeta}
              searchTerm={searchTerm}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
              filter={filter}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <AttributesAccordion
              id="scope_attributes"
              title={i18n.translate('unifiedDocViewer.docView.attributes.scopeAttributesTitle', {
                defaultMessage: 'Scope attributes',
              })}
              ariaLabel={i18n.translate(
                'unifiedDocViewer.docView.attributes.scopeAttributesTitle.ariaLabel',
                { defaultMessage: 'Scope attributes' }
              )}
              fields={scopeAttributesFields}
              hit={hit}
              dataView={dataView}
              columns={columns}
              columnsMeta={columnsMeta}
              searchTerm={searchTerm}
              onAddColumn={onAddColumn}
              onRemoveColumn={onRemoveColumn}
              filter={filter}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
