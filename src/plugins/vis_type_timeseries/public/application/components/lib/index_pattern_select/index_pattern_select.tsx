/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useContext, useCallback, useEffect } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { EuiFormRow, htmlIdGenerator } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldTextSelect } from './field_text_select';
import { ComboBoxSelect } from './combo_box_select';
import { MigrationPopover } from './migrate_popover';
import { PanelModelContext } from '../../../contexts/panel_model_context';
import { getDataStart } from '../../../../services';
import {
  isStringTypeIndexPattern,
  convertIndexPatternObjectToStringRepresentation,
} from '../../../../../common/index_patterns_utils';

import type { IIndexPattern } from '../../../../../../data/public';
import type { IndexPatternObject } from '../../../../../common/types';

const USE_KIBANA_INDEXES_KEY = 'use_kibana_indexes';

interface IndexPatternSelectProps {
  value: IndexPatternObject;
  indexPatternName: string;
  onChange: Function;
  disabled?: boolean;
  allowIndexSwitchingMode?: boolean;
}

const toIndexPatternObject = (index: IIndexPattern): IndexPatternObject => ({
  id: index.id!,
  title: index.title,
});

export const IndexPatternSelect = ({
  value,
  indexPatternName,
  onChange,
  disabled,
  allowIndexSwitchingMode,
}: IndexPatternSelectProps) => {
  const htmlId = htmlIdGenerator();

  const panelModel = useContext(PanelModelContext);
  const [defaultIndex, setDefaultIndex] = useState<IndexPatternObject>();
  const [matchedIndex, setMatchedIndex] = useState<IndexPatternObject>();
  const [inputValue, setInputValue] = useState<IndexPatternObject>(value);

  const useKibanaIndices = Boolean(panelModel?.[USE_KIBANA_INDEXES_KEY]);
  const Component = useKibanaIndices ? ComboBoxSelect : FieldTextSelect;

  useDebounce(
    () => {
      if (inputValue !== value) {
        onChange({
          [indexPatternName]: inputValue,
        });
      }
    },
    300,
    [onChange, inputValue, indexPatternName, value]
  );

  useEffect(() => {
    async function retrieveIndex() {
      const { indexPatterns } = getDataStart();

      if (isStringTypeIndexPattern(value)) {
        const index = (await indexPatterns.find(value)).find((i) => i.title === value);

        if (index) {
          return setMatchedIndex(toIndexPatternObject(index));
        }
      }

      setMatchedIndex(undefined);
    }

    retrieveIndex();
  }, [value]);

  useEffect(() => {
    async function getDefaultIndex() {
      const { indexPatterns } = getDataStart();
      const index = await indexPatterns.getDefault();

      if (index) {
        return setDefaultIndex(toIndexPatternObject(index));
      }
    }

    getDefaultIndex();
  }, []);

  const onModeChange = useCallback(
    (useKibanaIndexes: boolean) => {
      onChange({
        [USE_KIBANA_INDEXES_KEY]: useKibanaIndexes,
      });
      setInputValue(matchedIndex ?? '');
    },
    [onChange, matchedIndex]
  );

  return (
    <EuiFormRow
      id={htmlId('indexPattern')}
      label={i18n.translate('visTypeTimeseries.indexPatternSelect.label', {
        defaultMessage: 'Index pattern',
      })}
      helpText={
        !value &&
        i18n.translate('visTypeTimeseries.indexPatternSelect.helpText', {
          defaultMessage: 'Default index pattern is used. To query all indexes use *',
        })
      }
      labelAppend={
        value &&
        isStringTypeIndexPattern(value) && (
          <MigrationPopover
            onModeChange={onModeChange}
            value={value}
            matchedIndex={matchedIndex}
            useKibanaIndices={useKibanaIndices}
          />
        )
      }
    >
      <Component
        value={inputValue}
        disabled={disabled}
        allowSwitchMode={allowIndexSwitchingMode}
        onIndexChange={setInputValue}
        onModeChange={onModeChange}
        placeholder={convertIndexPatternObjectToStringRepresentation(defaultIndex)}
        data-test-subj="metricsIndexPatternInput"
      />
    </EuiFormRow>
  );
};
