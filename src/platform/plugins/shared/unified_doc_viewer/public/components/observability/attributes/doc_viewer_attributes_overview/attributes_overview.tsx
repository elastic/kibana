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
import { SHOW_MULTIFIELDS, getShouldShowFieldHandler } from '@kbn/discover-utils';
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
import { getAttributesTitle } from './get_attributes_title';

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
  const { storage, uiSettings } = getUnifiedDocViewerServices();
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const { searchTerm, onChangeSearchTerm } = useTableFilters({
    storage,
    storageKey: LOCAL_STORAGE_KEY_SEARCH_TERM,
  });

  const flattened = hit.flattened;

  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(flattened), dataView, showMultiFields),
    [flattened, dataView, showMultiFields]
  );

  const attributesTitle = getAttributesTitle(hit);

  const allFields = Object.keys(flattened);

  // it filters out multifields that have a parent, to prevent entries for multifields like this: field, field.keyword, field.whatever
  const filteredFields = useMemo(
    () => allFields.filter(shouldShowFieldHandler),
    [allFields, shouldShowFieldHandler]
  );

  const groupedFields = useMemo(() => {
    const attributesFields: string[] = [];
    const resourceAttributesFields: string[] = [];
    const scopeAttributesFields: string[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();
    for (const fieldName of filteredFields) {
      const lowerFieldName = fieldName.toLowerCase();
      if (!lowerFieldName.includes(lowerSearchTerm)) {
        continue;
      }
      if (lowerFieldName.startsWith('resource.attributes.')) {
        resourceAttributesFields.push(fieldName);
      } else if (lowerFieldName.startsWith('scope.attributes.')) {
        scopeAttributesFields.push(fieldName);
      } else if (lowerFieldName.startsWith('attributes.')) {
        attributesFields.push(fieldName);
      }
    }
    return { attributesFields, resourceAttributesFields, scopeAttributesFields };
  }, [filteredFields, searchTerm]);

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM)
    : 0;

  const accordionConfigs = [
    {
      id: 'signal_attributes',
      title: attributesTitle,
      ariaLabel: attributesTitle,
      fields: groupedFields.attributesFields,
    },
    {
      id: 'resource_attributes',
      title: i18n.translate('unifiedDocViewer.docView.attributes.resourceAttributesTitle', {
        defaultMessage: 'Resource attributes',
      }),
      ariaLabel: i18n.translate(
        'unifiedDocViewer.docView.attributes.resourceAttributesTitle.ariaLabel',
        { defaultMessage: 'Resource attributes' }
      ),
      fields: groupedFields.resourceAttributesFields,
    },
    {
      id: 'scope_attributes',
      title: i18n.translate('unifiedDocViewer.docView.attributes.scopeAttributesTitle', {
        defaultMessage: 'Scope attributes',
      }),
      ariaLabel: i18n.translate(
        'unifiedDocViewer.docView.attributes.scopeAttributesTitle.ariaLabel',
        { defaultMessage: 'Scope attributes' }
      ),
      fields: groupedFields.scopeAttributesFields,
    },
  ];

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
          {accordionConfigs.map(({ id, title, ariaLabel, fields }) => (
            <React.Fragment key={id}>
              <EuiFlexItem grow={false}>
                <AttributesAccordion
                  id={id}
                  title={title}
                  ariaLabel={ariaLabel}
                  fields={fields}
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
            </React.Fragment>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
