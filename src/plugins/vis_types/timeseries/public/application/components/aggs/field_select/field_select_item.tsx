/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiComboBoxProps,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { AddDeleteButtons } from '../../add_delete_buttons';
import { INVALID_FIELD_ID } from './field_select_utils';

export interface FieldSelectItemProps {
  onChange: (options: Array<EuiComboBoxOptionOption<string>>) => void;
  options: EuiComboBoxProps<string>['options'];
  selectedOptions: EuiComboBoxProps<string>['selectedOptions'];
  placeholder?: string;
  disabled?: boolean;
  disableAdd?: boolean;
  disableDelete?: boolean;
  onNewItemAdd?: () => void;
  onDeleteItem?: () => void;
}

const defaultPlaceholder = i18n.translate('visTypeTimeseries.fieldSelect.selectFieldPlaceholder', {
  defaultMessage: 'Select field...',
});

export function FieldSelectItem({
  options,
  selectedOptions,
  placeholder = defaultPlaceholder,
  disabled,
  disableAdd,
  disableDelete,

  onChange,
  onDeleteItem,
  onNewItemAdd,
}: FieldSelectItemProps) {
  const isInvalid = Boolean(selectedOptions?.find((item) => item.id === INVALID_FIELD_ID));

  return (
    <EuiFlexGroup alignItems="center" gutterSize={'xs'}>
      <EuiFlexItem grow={true}>
        <EuiComboBox
          placeholder={placeholder}
          isDisabled={disabled}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onChange}
          singleSelection={{ asPlainText: true }}
          isInvalid={isInvalid}
          fullWidth={true}
          data-test-subj="fieldSelectItem"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <AddDeleteButtons
          onAdd={onNewItemAdd}
          onDelete={onDeleteItem}
          disableDelete={disableDelete}
          disableAdd={disableAdd}
          responsive={false}
          testSubj="fieldSelectItem"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
