/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import {
  EuiSpacer,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { SHOW_MULTIFIELDS, getShouldShowFieldHandler } from '@kbn/discover-utils';
import useLocalStorage from 'react-use/lib/useLocalStorage';
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
import { getAttributeDisplayName } from './get_attribute_display_name';
import { HIDE_NULL_VALUES } from '../../../doc_viewer_table/table';
import { AttributesEmptyPrompt } from './attributes_empty_prompt';

export interface AttributeField {
  name: string; // full field name for filtering/actions
  displayName: string; // stripped prefix for UI display
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
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const { storage, uiSettings } = getUnifiedDocViewerServices();
  const isEsqlMode = Array.isArray(textBasedHits);
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const { searchTerm, onChangeSearchTerm } = useTableFilters({
    storage,
    storageKey: LOCAL_STORAGE_KEY_SEARCH_TERM,
  });
  const [areNullValuesHidden, setAreNullValuesHidden] = useLocalStorage(HIDE_NULL_VALUES, false);

  const flattened = hit.flattened;

  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(flattened), dataView, showMultiFields),
    [flattened, dataView, showMultiFields]
  );

  const attributesTitle = getAttributesTitle(hit);

  const allFields = Object.keys(flattened);

  const groupedFields = useMemo(() => {
    const attributesFields: AttributeField[] = [];
    const resourceAttributesFields: AttributeField[] = [];
    const scopeAttributesFields: AttributeField[] = [];
    const lowerSearchTerm = searchTerm.toLowerCase();

    allFields.reduce((acc, fieldName) => {
      const lowerFieldName = fieldName.toLowerCase();

      // it filters out multifields that have a parent, to prevent entries for multifields like this: field, field.keyword, field.whatever
      if (!shouldShowFieldHandler(fieldName)) {
        return acc;
      }

      if (!lowerFieldName.includes(lowerSearchTerm)) {
        return acc;
      }

      if (isEsqlMode && areNullValuesHidden && flattened[fieldName] == null) {
        return acc;
      }

      if (lowerFieldName.startsWith('resource.attributes.')) {
        resourceAttributesFields.push({
          name: fieldName,
          displayName: getAttributeDisplayName(fieldName),
        });
      } else if (lowerFieldName.startsWith('scope.attributes.')) {
        scopeAttributesFields.push({
          name: fieldName,
          displayName: getAttributeDisplayName(fieldName),
        });
      } else if (lowerFieldName.startsWith('attributes.')) {
        attributesFields.push({
          name: fieldName, // full name for filtering/actions
          displayName: getAttributeDisplayName(fieldName), // for UI
        });
      }

      return acc;
    }, null);

    return { attributesFields, resourceAttributesFields, scopeAttributesFields };
  }, [allFields, flattened, searchTerm, shouldShowFieldHandler, isEsqlMode, areNullValuesHidden]);

  const { attributesFields, resourceAttributesFields, scopeAttributesFields } = groupedFields;

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(containerRef, decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM)
    : 0;

  const accordionConfigs = [
    {
      id: 'signal_attributes',
      title: attributesTitle,
      ariaLabel: attributesTitle,
      fields: attributesFields,
      tooltipMessage: i18n.translate(
        'unifiedDocViewer.docView.attributes.signalAttributesTooltip',
        {
          defaultMessage:
            'Metadata added by the instrumentation library to describe the telemetry data (e.g., HTTP method, user agent).',
        }
      ),
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
      fields: resourceAttributesFields,
      tooltipMessage: i18n.translate(
        'unifiedDocViewer.docView.attributes.resourceAttributesTooltip',
        {
          defaultMessage:
            'Metadata originally set at the source of the telemetry, such as in the SDK or agent that generated the data.',
        }
      ),
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
      fields: scopeAttributesFields,
      tooltipMessage: i18n.translate('unifiedDocViewer.docView.attributes.scopeAttributesTooltip', {
        defaultMessage:
          'Metadata associated with the instrumentation scope (i.e., the library/module that produced the telemetry), helping identify its origin and version.',
      }),
    },
  ];

  const onHideNullValuesChange = useCallback(
    (e: EuiSwitchEvent) => {
      setAreNullValuesHidden(e.target.checked);
    },
    [setAreNullValuesHidden]
  );

  const noFields =
    attributesFields.length === 0 &&
    resourceAttributesFields.length === 0 &&
    scopeAttributesFields.length === 0;

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
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          responsive={false}
          wrap
          direction="row"
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="m"
        >
          {isEsqlMode && (
            <EuiFlexItem grow={false}>
              <EuiSwitch
                label={i18n.translate('unifiedDocViewer.hideNullValues.switchLabel', {
                  defaultMessage: 'Hide null fields',
                  description: 'Switch label to hide fields with null values in the table',
                })}
                checked={areNullValuesHidden ?? false}
                onChange={onHideNullValuesChange}
                compressed
                data-test-subj="unifiedDocViewerHideNullValuesSwitch"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
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
        {noFields ? (
          <AttributesEmptyPrompt />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
            {accordionConfigs.map(({ id, title, ariaLabel, fields, tooltipMessage }) => (
              <React.Fragment key={id}>
                <EuiFlexItem grow={false}>
                  <AttributesAccordion
                    id={id}
                    title={title}
                    ariaLabel={ariaLabel}
                    tooltipMessage={tooltipMessage}
                    fields={fields}
                    hit={hit}
                    dataView={dataView}
                    columns={columns}
                    columnsMeta={columnsMeta}
                    searchTerm={searchTerm}
                    onAddColumn={onAddColumn}
                    onRemoveColumn={onRemoveColumn}
                    filter={filter}
                    isEsqlMode={isEsqlMode}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiSpacer size="s" />
                </EuiFlexItem>
              </React.Fragment>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
