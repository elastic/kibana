/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiIcon,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { uniqBy } from 'lodash/fp';
import type { BrowserFields } from '@kbn/rule-registry-plugin/common';
import { EcsFlat } from '@elastic/ecs';
import { EcsMetadata } from '@kbn/alerts-as-data-utils/src/field_maps/types';

import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import type { BrowserFieldItem, FieldTableColumns, GetFieldTableColumns } from '../../types';
import { FieldName } from '../field_name';
import * as i18n from '../../translations';
import { styles } from './field_items.style';
import {
  getCategory,
  getDescription,
  getEmptyValue,
  getExampleText,
  getIconFromType,
} from '../../helpers';

/**
 * For the Cases field we want to change the
 * name of the field from kibana.alert.case_ids to Cases.
 */
const getFieldItemName = (name: string): string => {
  if (name === ALERT_CASE_IDS) {
    return i18n.CASES;
  }

  if (name === ALERT_MAINTENANCE_WINDOW_IDS) {
    return i18n.MAINTENANCE_WINDOWS;
  }

  return name;
};

/**
 * Returns the field items of all categories selected
 */
export const getFieldItemsData = ({
  browserFields,
  selectedCategoryIds,
  columnIds,
}: {
  browserFields: BrowserFields;
  selectedCategoryIds: string[];
  columnIds: string[];
}): { fieldItems: BrowserFieldItem[] } => {
  const categoryIds =
    selectedCategoryIds.length > 0 ? selectedCategoryIds : Object.keys(browserFields);
  const selectedFieldIds = new Set(columnIds);

  const fieldItems = uniqBy(
    'name',
    categoryIds.reduce<BrowserFieldItem[]>((fieldItemsAcc, categoryId) => {
      const categoryBrowserFields = Object.values(browserFields[categoryId]?.fields ?? {});
      if (categoryBrowserFields.length > 0) {
        fieldItemsAcc.push(
          ...categoryBrowserFields.map(({ name = '', ...field }) => {
            return {
              name,
              type: field.type,
              description: getDescription(name, EcsFlat as Record<string, EcsMetadata>),
              example: field.example?.toString(),
              category: getCategory(name),
              selected: selectedFieldIds.has(name),
              isRuntime: !!field.runtimeField,
            };
          })
        );
      }
      return fieldItemsAcc;
    }, [])
  );
  return { fieldItems };
};

const getDefaultFieldTableColumns = ({ highlight }: { highlight: string }): FieldTableColumns => {
  const nameColumn = {
    field: 'name',
    name: i18n.NAME,
    render: (name: string, { type }: BrowserFieldItem) => {
      return (
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>
            <EuiToolTip content={type}>
              <EuiIcon
                data-test-subj={`field-${name}-icon`}
                css={styles.icon}
                type={getIconFromType(type ?? null)}
              />
            </EuiToolTip>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <FieldName fieldId={getFieldItemName(name)} highlight={highlight} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    sortable: true,
    width: '225px',
  };

  const descriptionColumn = {
    field: 'description',
    name: i18n.DESCRIPTION,
    render: (description: string, { name, example }: BrowserFieldItem) => (
      <EuiToolTip content={description}>
        <>
          <EuiScreenReaderOnly data-test-subj="descriptionForScreenReaderOnly">
            <p>{i18n.DESCRIPTION_FOR_FIELD(name)}</p>
          </EuiScreenReaderOnly>
          <span css={styles.truncatable}>
            <span css={styles.description} data-test-subj={`field-${name}-description`}>
              {`${description ?? getEmptyValue()} ${getExampleText(example)}`}
            </span>
          </span>
        </>
      </EuiToolTip>
    ),
    sortable: true,
    width: '400px',
  };

  const categoryColumn = {
    field: 'category',
    name: i18n.CATEGORY,
    render: (category: string, { name }: BrowserFieldItem) => (
      <EuiBadge data-test-subj={`field-${name}-category`}>{category}</EuiBadge>
    ),
    sortable: true,
    width: '130px',
  };

  return [nameColumn, ...[descriptionColumn], categoryColumn];
};

/**
 * Returns a table column template provided to the `EuiInMemoryTable`'s
 * `columns` prop
 */
export const getFieldColumns = ({
  getFieldTableColumns,
  highlight = '',
  onHide,
  onToggleColumn,
}: {
  getFieldTableColumns?: GetFieldTableColumns;
  highlight?: string;
  onHide: () => void;
  onToggleColumn: (id: string) => void;
}): FieldTableColumns => [
  {
    field: 'selected',
    name: '',
    render: (selected: boolean, { name }) => (
      <EuiToolTip content={i18n.VIEW_COLUMN(name)}>
        <EuiCheckbox
          aria-label={i18n.VIEW_COLUMN(name)}
          checked={selected}
          data-test-subj={`field-${name}-checkbox`}
          data-colindex={1}
          id={name}
          onChange={() => onToggleColumn(name)}
        />
      </EuiToolTip>
    ),
    sortable: false,
    width: '25px',
  },
  ...(getFieldTableColumns
    ? getFieldTableColumns({ highlight, onHide })
    : getDefaultFieldTableColumns({ highlight })),
];
