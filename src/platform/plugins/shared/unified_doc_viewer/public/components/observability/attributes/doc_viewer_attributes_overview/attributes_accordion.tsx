/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useMemo } from 'react';
import { EuiAccordion, EuiIconTip, EuiNotificationBadge, EuiText, useEuiTheme } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import DocViewerTable from '../../../doc_viewer_table';
import { AttributesEmptyPrompt } from './attributes_empty_prompt';

interface AttributesAccordionProps {
  id: string;
  title: string;
  ariaLabel: string;
  tooltipMessage: string;
  fields: string[];
  hit: DataTableRecord;
  dataView: DataView;
  columns?: string[];
  columnsMeta?: DataTableColumnsMeta;
  onAddColumn?: (col: string) => void;
  onRemoveColumn?: (col: string) => void;
  filter?: DocViewFilterFn;
  textBasedHits?: DataTableRecord[];
}

export const AttributesAccordion = ({
  id,
  title,
  tooltipMessage,
  fields,
  hit,
  dataView,
  columns,
  columnsMeta,
  onAddColumn,
  onRemoveColumn,
  filter,
  textBasedHits,
}: AttributesAccordionProps) => {
  const filteredHit = useMemo(
    () => ({
      ...hit,
      flattened: fields.reduce<any>((acc, fieldName) => {
        acc[fieldName] = hit.flattened[fieldName];
        return acc;
      }, {}),
    }),
    [fields, hit]
  );

  const { euiTheme } = useEuiTheme();
  return (
    <EuiAccordion
      id={id}
      buttonContent={
        <EuiText size="s">
          <strong css={{ marginRight: euiTheme.size.xs }}>{title}</strong>
          <EuiIconTip
            aria-label={tooltipMessage}
            type="questionInCircle"
            color="subdued"
            size="s"
            content={tooltipMessage}
            iconProps={{
              className: 'eui-alignTop',
            }}
          />
        </EuiText>
      }
      initialIsOpen={fields.length > 0}
      extraAction={
        <EuiNotificationBadge size="m" color="subdued">
          {fields.length}
        </EuiNotificationBadge>
      }
      paddingSize="m"
    >
      {fields.length === 0 ? (
        <AttributesEmptyPrompt />
      ) : (
        <DocViewerTable
          hit={filteredHit}
          dataView={dataView}
          columns={columns}
          columnsMeta={columnsMeta}
          hideTableFilters
          hideNullFieldsToggle
          hideSelectedOnlyToggle
          hidePagination
          hidePin
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          filter={filter}
          textBasedHits={textBasedHits}
        />
      )}
    </EuiAccordion>
  );
};
