/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useContext, useCallback } from 'react';
import useDebounce from 'react-use/lib/useDebounce';
import { FieldTextSelect } from './field_text_select';
import { ComboBoxSelect } from './combo_box_select';
import { PanelModelContext } from '../../../contexts/panel_model_context';
import type { IndexPatternObject } from '../../../../../common/types';

const USE_KIBANA_INDEXES_KEY = 'use_kibana_indexes';

interface IndexPatternSelectProps {
  value: IndexPatternObject;
  indexPatternName: string;
  defaultIndexPattern: string;
  onChange: Function;
  disabled?: boolean;
  allowSwitchUseKibanaIndexesMode?: boolean;
}

export const IndexPatternSelect = ({
  value,
  indexPatternName,
  onChange,
  disabled,
  defaultIndexPattern,
  allowSwitchUseKibanaIndexesMode,
}: IndexPatternSelectProps) => {
  const panelModel = useContext(PanelModelContext);
  const useKibanaIndices = Boolean(panelModel?.[USE_KIBANA_INDEXES_KEY]);
  const [inputValue, setInputValue] = useState<IndexPatternObject>(value);
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

  const onModeChange = useCallback(
    (useKibanaIndexes: boolean, index?: IndexPatternObject) => {
      onChange({
        [USE_KIBANA_INDEXES_KEY]: useKibanaIndexes,
      });
      setInputValue(index ?? '');
    },
    [onChange]
  );

  return (
    <Component
      value={inputValue}
      disabled={disabled}
      data-test-subj="metricsIndexPatternInput"
      placeholder={defaultIndexPattern}
      onIndexChange={setInputValue}
      onModeChange={onModeChange}
      allowSwitchUseKibanaIndexesMode={allowSwitchUseKibanaIndexesMode}
    />
  );
};
