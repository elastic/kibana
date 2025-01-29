/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useState, useEffect } from 'react';
import { EuiComboBox, EuiComboBoxProps } from '@elastic/eui';
import type { DataViewsService } from '@kbn/data-views-plugin/public';
import { getDataViewsStart } from '../../../../services';

import { SwitchModePopover } from './switch_mode_popover';

import type { SelectIndexComponentProps } from './types';
import type { IndexPatternValue } from '../../../../../common/types';

/** @internal **/
type IdsWithTitle = Awaited<ReturnType<DataViewsService['getIdsWithTitle']>>;

/** @internal **/
type SelectedOptions = EuiComboBoxProps<string>['selectedOptions'];

const toComboBoxOptions = (options: IdsWithTitle) =>
  options.map(({ name, title, id }) => ({ label: name ? name : title, id }));

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

  const onComboBoxChange = useCallback<
    NonNullable<EuiComboBoxProps<IndexPatternValue>['onChange']>
  >(
    ([selected]) => {
      onIndexChange(selected ? { id: selected.id! } : '');
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
            label: indexPattern.getName(),
          },
        ];
      }
    }
    setSelectedOptions(options);
  }, [fetchedIndex]);

  useEffect(() => {
    async function fetchIndexes() {
      setAvailableIndexes(await getDataViewsStart().getIdsWithTitle());
    }

    fetchIndexes();
  }, []);

  const isInvalid = Boolean(fetchedIndex.missedIndex);

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      isInvalid={isInvalid}
      onChange={onComboBoxChange}
      options={toComboBoxOptions(availableIndexes)}
      selectedOptions={selectedOptions}
      isDisabled={disabled}
      placeholder={
        isInvalid
          ? i18n.translate('visTypeTimeseries.indexPatternSelect.noDataView', {
              defaultMessage: 'Data view not found',
            })
          : placeholder
      }
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
