/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useState, useEffect } from 'react';
import type { UnwrapPromise } from '@kbn/utility-types';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';
import { getDataStart } from '../../../services';

import type { SelectIndexComponentProps } from './types';
import type { IndexPatternObject } from '../../../../common/types';
import type { IndexPatternsService } from '../../../../../data/public';
import { SwitchModePopover } from './switch_mode_popover';

/** @internal **/
type IdsWithTitle = UnwrapPromise<ReturnType<IndexPatternsService['getIdsWithTitle']>>;

const toSelectedOptions = (
  value: IndexPatternObject
): EuiComboBoxProps<IndexPatternObject>['selectedOptions'] => {
  if (value) {
    if (typeof value === 'string') {
      return [{ label: value ?? '' }];
    }
    return [
      {
        id: value.id ?? '',
        label: value.title ?? '',
      },
    ];
  }
  return [];
};

export const ComboBoxSelect = ({
  onIndexChange,
  onModeChange,
  disabled,
  value,
  placeholder,
  allowSwitchUseKibanaIndexesMode,
}: SelectIndexComponentProps) => {
  const [availableIndexes, setAvailableIndexes] = useState<IdsWithTitle>([]);

  const onComboBoxChange: EuiComboBoxProps<IndexPatternObject>['onChange'] = useCallback(
    ([selected]) => {
      onIndexChange(selected ? { id: selected.id, title: selected.label } : '');
    },
    [onIndexChange]
  );

  const toComboBoxOptions = (options: IdsWithTitle) =>
    options.map(({ title, id }) => ({ label: title, id }));

  useEffect(() => {
    async function fetchIndexes() {
      setAvailableIndexes(await getDataStart().indexPatterns.getIdsWithTitle());
    }

    fetchIndexes();
  }, []);

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      onChange={onComboBoxChange}
      options={toComboBoxOptions(availableIndexes)}
      selectedOptions={toSelectedOptions(value)}
      isDisabled={disabled}
      placeholder={placeholder}
      {...(allowSwitchUseKibanaIndexesMode && {
        append: <SwitchModePopover isKibanaIndicesModeOn={true} onModeChange={onModeChange} />,
      })}
    />
  );
};
