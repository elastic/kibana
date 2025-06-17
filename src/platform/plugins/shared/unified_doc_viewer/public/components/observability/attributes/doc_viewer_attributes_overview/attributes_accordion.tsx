/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiAccordion, EuiText, EuiNotificationBadge } from '@elastic/eui';
import { AttributesTable } from './attributes_table';

interface AttributesAccordionProps {
  id: string;
  title: string;
  ariaLabel: string;
  fields: string[];
  hit: any;
  dataView: any;
  columns: any;
  columnsMeta: any;
  searchTerm: string;
  onAddColumn?: (col: string) => void;
  onRemoveColumn?: (col: string) => void;
  filter?: any;
}

export const AttributesAccordion: React.FC<AttributesAccordionProps> = ({
  id,
  title,
  ariaLabel,
  fields,
  hit,
  dataView,
  columns,
  columnsMeta,
  searchTerm,
  onAddColumn,
  onRemoveColumn,
  filter,
}) => (
  <EuiAccordion
    id={id}
    buttonContent={
      <EuiText size="s">
        <strong aria-label={ariaLabel}>{title}</strong>
      </EuiText>
    }
    initialIsOpen={fields.length > 0}
    forceState={fields.length === 0 ? 'closed' : undefined}
    isDisabled={fields.length === 0}
    extraAction={
      <EuiNotificationBadge size="m" color="subdued">
        {fields.length}
      </EuiNotificationBadge>
    }
    paddingSize="m"
  >
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
    />
  </EuiAccordion>
);
