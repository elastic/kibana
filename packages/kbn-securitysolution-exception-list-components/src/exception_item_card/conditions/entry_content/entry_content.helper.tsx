/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ElementType } from 'react';
import { EuiExpression, EuiBadge } from '@elastic/eui';
import type { ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { ValueWithSpaceWarning } from '../../../..';
import { OPERATOR_TYPE_LABELS_EXCLUDED, OPERATOR_TYPE_LABELS_INCLUDED } from '../conditions.config';
import type { Entry } from '../types';

const getEntryValue = (type: string, value: string | string[], showValueListModal: ElementType) => {
  const ShowValueListModal = showValueListModal;
  if (type === 'match_any' && Array.isArray(value)) {
    return value.map((currentValue, index) => (
      <EuiBadge key={index} data-test-subj={`matchAnyBadge${index}`} color="hollow">
        {currentValue}
      </EuiBadge>
    ));
  } else if (type === 'list' && value) {
    return (
      <ShowValueListModal shouldShowChildrenIfNoPermissions listId={value.toString()}>
        {value}
      </ShowValueListModal>
    );
  }
  return value ?? '';
};

export const getEntryOperator = (type: ListOperatorTypeEnum, operator: string) => {
  if (type === 'nested') return '';
  return operator === 'included'
    ? OPERATOR_TYPE_LABELS_INCLUDED[type] ?? type
    : OPERATOR_TYPE_LABELS_EXCLUDED[type] ?? type;
};

export const getValue = (entry: Entry) => {
  if (entry.type === 'list') return entry.list.id;

  return 'value' in entry ? entry.value : '';
};

export const getValueExpression = (
  type: ListOperatorTypeEnum,
  operator: string,
  value: string | string[],
  showValueListModal: ElementType
) => (
  <>
    <EuiExpression
      description={getEntryOperator(type, operator)}
      value={getEntryValue(type, value, showValueListModal)}
      data-test-subj="entryValueExpression"
    />
    <ValueWithSpaceWarning value={value} />
  </>
);
