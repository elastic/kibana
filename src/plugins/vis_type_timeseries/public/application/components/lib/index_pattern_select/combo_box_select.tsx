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
import { getDataStart } from '../../../../services';

import { SwitchModePopover } from './switch_mode_popover';

import type { SelectIndexComponentProps } from './types';
import type { IndexPatternValue } from '../../../../../common/types';
import type { IndexPatternsService } from '../../../../../../data/public';

/** @internal **/
type IdsWithTitle = UnwrapPromise<ReturnType<IndexPatternsService['getIdsWithTitle']>>;

/** @internal **/
type SelectedOptions = EuiComboBoxProps<string>['selectedOptions'];

const toComboBoxOptions = (options: IdsWithTitle) =>
  options.map(({ title, id }) => ({ label: title, id }));

export const ComboBoxSelect = ({
  fetchedIndex,
  onIndexChange,
  onModeChange,
  disabled,
  placeholder,
  allowSwitchMode,
  'data-test-subj': dataTestSubj,
}: SelectIndexComponentProps) => {
  const [availableIndexes, setAvailableIndexes] = useState<IdsWithTitle>([]);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>([]);

  const onComboBoxChange: EuiComboBoxProps<IndexPatternValue>['onChange'] = useCallback(
    ([selected]) => {
      onIndexChange(selected ? { id: selected.id } : '');
    },
    [onIndexChange]
  );

  useEffect(() => {
    let options: SelectedOptions = [];
    const { indexPattern, indexPatternString } = fetchedIndex;

    if (indexPattern || indexPatternString) {
      if (!indexPattern) {
        options = [{ label: indexPatternString ?? '' }];
      } else {
        options = [
          {
            id: indexPattern.id,
            label: indexPattern.title,
          },
        ];
      }
    }
    setSelectedOptions(options);
  }, [fetchedIndex]);

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
      selectedOptions={selectedOptions}
      isDisabled={disabled}
      placeholder={placeholder}
      data-test-subj={dataTestSubj}
      {...(allowSwitchMode && {
        append: (
          <SwitchModePopover
            onModeChange={onModeChange}
            fetchedIndex={fetchedIndex}
            useKibanaIndices={true}
          />
        ),
      })}
    />
  );
};
