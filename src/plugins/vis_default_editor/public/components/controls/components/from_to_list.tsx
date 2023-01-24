/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFieldText, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { search } from '@kbn/data-plugin/public';
import { InputList, InputListConfig, InputModel, InputObject, InputItem } from './input_list';

const EMPTY_STRING = '';

export interface FromToObject extends InputObject {
  from?: string;
  to?: string;
}

type FromToModel = InputModel & {
  from: InputItem;
  to: InputItem;
};

interface FromToListProps {
  list: FromToObject[];
  showValidation: boolean;
  onBlur(): void;
  onChange(list: FromToObject[]): void;
  setValidity(isValid: boolean): void;
}

const defaultConfig = {
  defaultValue: {
    from: { value: '0.0.0.0', model: '0.0.0.0', isInvalid: false },
    to: { value: '255.255.255.255', model: '255.255.255.255', isInvalid: false },
  },
  validateClass: search.aggs.IpAddress,
  getModelValue: (item: FromToObject = {}) => ({
    from: {
      value: item.from || EMPTY_STRING,
      model: item.from || EMPTY_STRING,
      isInvalid: false,
    },
    to: { value: item.to || EMPTY_STRING, model: item.to || EMPTY_STRING, isInvalid: false },
  }),
  getRemoveBtnAriaLabel: (item: FromToModel) =>
    i18n.translate('visDefaultEditor.controls.ipRanges.removeRangeAriaLabel', {
      defaultMessage: 'Remove the range of {from} to {to}',
      values: { from: item.from.value || '*', to: item.to.value || '*' },
    }),
  onChangeFn: ({ from, to }: FromToModel) => {
    const result: FromToObject = {};
    if (from.model) {
      result.from = from.model;
    }
    if (to.model) {
      result.to = to.model;
    }
    return result;
  },
  hasInvalidValuesFn: ({ from, to }: FromToModel) => from.isInvalid || to.isInvalid,
  modelNames: ['from', 'to'],
};

function FromToList({ showValidation, onBlur, ...rest }: FromToListProps) {
  const renderInputRow = useCallback(
    (item: FromToModel, index, onChangeValue) => (
      <>
        <EuiFlexItem>
          <EuiFieldText
            aria-label={i18n.translate('visDefaultEditor.controls.ipRanges.ipRangeFromAriaLabel', {
              defaultMessage: 'IP range from: {value}',
              values: { value: item.from.value || '*' },
            })}
            compressed
            isInvalid={showValidation ? item.from.isInvalid : false}
            placeholder="*"
            onChange={(ev) => {
              onChangeValue(index, ev.target.value, 'from');
            }}
            value={item.from.value}
            onBlur={onBlur}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sortRight" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldText
            aria-label={i18n.translate('visDefaultEditor.controls.ipRanges.ipRangeToAriaLabel', {
              defaultMessage: 'IP range to: {value}',
              values: { value: item.to.value || '*' },
            })}
            compressed
            isInvalid={showValidation ? item.to.isInvalid : false}
            placeholder="*"
            onChange={(ev) => {
              onChangeValue(index, ev.target.value, 'to');
            }}
            value={item.to.value}
            onBlur={onBlur}
          />
        </EuiFlexItem>
      </>
    ),
    [onBlur, showValidation]
  );
  const fromToListConfig: InputListConfig = {
    ...defaultConfig,
    renderInputRow,
  };

  return <InputList config={fromToListConfig} {...rest} />;
}

export { FromToList };
