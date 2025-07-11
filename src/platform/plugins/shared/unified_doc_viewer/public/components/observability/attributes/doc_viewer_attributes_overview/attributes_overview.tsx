/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { SHOW_MULTIFIELDS, getShouldShowFieldHandler } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import React, { useCallback, useMemo, useRef } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import { getUnifiedDocViewerServices } from '../../../../plugin';
import {
  DEFAULT_MARGIN_BOTTOM,
  getTabContentAvailableHeight,
} from '../../../doc_viewer_source/get_height';
import { HIDE_NULL_VALUES } from '../../../doc_viewer_table/table';
import {
  LOCAL_STORAGE_KEY_SEARCH_TERM,
  useTableFilters,
} from '../../../doc_viewer_table/table_filters';
import { AttributesAccordion } from './attributes_accordion';
import { AttributesEmptyPrompt } from './attributes_empty_prompt';
import { getAttributesTitle } from './get_attributes_title';
import { groupAttributesFields } from './group_attributes_fields';

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
  const containerRef = useRef<HTMLDivElement>();
  const { storage, uiSettings } = getUnifiedDocViewerServices();
  const isEsqlMode = Array.isArray(textBasedHits);
  const showMultiFields = uiSettings.get(SHOW_MULTIFIELDS);
  const { searchTerm, onChangeSearchTerm } = useTableFilters({
    storage,
    storageKey: LOCAL_STORAGE_KEY_SEARCH_TERM,
  });
  const [areNullValuesHidden, setAreNullValuesHidden] = useLocalStorage(HIDE_NULL_VALUES, false);

  const flattened = useMemo(() => hit.flattened, [hit.flattened]);

  const shouldShowFieldHandler = useMemo(
    () => getShouldShowFieldHandler(Object.keys(flattened), dataView, showMultiFields),
    [flattened, dataView, showMultiFields]
  );

  const attributesTitle = getAttributesTitle(hit);

  const allFields = useMemo(() => Object.keys(flattened), [flattened]);

  const { attributesFields, resourceAttributesFields, scopeAttributesFields } = useMemo(
    () =>
      groupAttributesFields({
        allFields,
        flattened,
        searchTerm,
        shouldShowFieldHandler,
        isEsqlMode,
        areNullValuesHidden,
      }),
    [allFields, flattened, searchTerm, shouldShowFieldHandler, isEsqlMode, areNullValuesHidden]
  );

  const containerHeight = containerRef
    ? getTabContentAvailableHeight(
        containerRef.current,
        decreaseAvailableHeightBy ?? DEFAULT_MARGIN_BOTTOM
      )
    : 0;

  const accordionConfigs = useMemo(() => {
    const filterFieldsBySearchTerm = (fields: string[]) =>
      fields.filter((field) => field.toLowerCase().includes(searchTerm.toLowerCase()));
    return [
      {
        id: 'signal_attributes',
        title: attributesTitle,
        ariaLabel: attributesTitle,
        fields: filterFieldsBySearchTerm(attributesFields),
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
        fields: filterFieldsBySearchTerm(resourceAttributesFields),
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
        fields: filterFieldsBySearchTerm(scopeAttributesFields),
        tooltipMessage: i18n.translate(
          'unifiedDocViewer.docView.attributes.scopeAttributesTooltip',
          {
            defaultMessage:
              'Metadata associated with the instrumentation scope (i.e., the library/module that produced the telemetry), helping identify its origin and version.',
          }
        ),
      },
    ];
  }, [
    attributesFields,
    attributesTitle,
    searchTerm,
    resourceAttributesFields,
    scopeAttributesFields,
  ]);

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
      ref={containerRef}
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
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {accordionConfigs.map(({ id, title, ariaLabel, fields, tooltipMessage }) => (
              <EuiFlexItem key={id}>
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
                  onAddColumn={onAddColumn}
                  onRemoveColumn={onRemoveColumn}
                  filter={filter}
                  textBasedHits={textBasedHits}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
