/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiAccordion, EuiText, EuiNotificationBadge, EuiIconTip, useEuiTheme } from '@elastic/eui';
import { DataTableColumnsMeta, DataTableRecord } from '@kbn/discover-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { AttributesTable } from './attributes_table';
import { AttributesEmptyPrompt } from './attributes_empty_prompt';
import { AttributeField } from './attributes_overview';

interface AttributesAccordionProps {
  id: string;
  title: string;
  ariaLabel: string;
  tooltipMessage: string;
  fields: AttributeField[];
  hit: DataTableRecord;
  dataView: DataView;
  columns?: string[];
  columnsMeta?: DataTableColumnsMeta;
  searchTerm: string;
  onAddColumn?: (col: string) => void;
  onRemoveColumn?: (col: string) => void;
  filter?: DocViewFilterFn;
  isEsqlMode: boolean;
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
  searchTerm,
  onAddColumn,
  onRemoveColumn,
  filter,
  isEsqlMode = false,
}: AttributesAccordionProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiAccordion
      id={id}
      buttonContent={
        <EuiText size="s">
          <strong css={{ marginRight: euiTheme.size.xs }}>{title}</strong>
          <EuiIconTip
            aria-label={tooltipMessage}
            type="question"
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
        <AttributesTable
          hit={hit}
          dataView={dataView}
          columns={columns}
          columnsMeta={columnsMeta}
          fields={fields}
          searchTerm={searchTerm}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
          filter={filter}
          isEsqlMode={isEsqlMode}
        />
      )}
    </EuiAccordion>
  );
};
