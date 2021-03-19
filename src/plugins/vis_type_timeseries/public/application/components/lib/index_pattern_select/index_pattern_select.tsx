/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useContext, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, htmlIdGenerator } from '@elastic/eui';

import { getDataStart } from '../../../../services';
import { PanelModelContext } from '../../../contexts/panel_model_context';

import {
  isStringTypeIndexPattern,
  fetchIndexPattern,
} from '../../../../../common/index_patterns_utils';

import { FieldTextSelect } from './field_text_select';
import { ComboBoxSelect } from './combo_box_select';
import { MigrationPopover } from './migrate_popover';

import type { IndexPatternObject, FetchedIndexPattern } from '../../../../../common/types';

const USE_KIBANA_INDEXES_KEY = 'use_kibana_indexes';

interface IndexPatternSelectProps {
  value: IndexPatternObject;
  indexPatternName: string;
  onChange: Function;
  disabled?: boolean;
  allowIndexSwitchingMode?: boolean;
}

const defaultIndexPatternHelpText = i18n.translate(
  'visTypeTimeseries.indexPatternSelect.defaultIndexPatternText',
  {
    defaultMessage: 'Default index pattern is used.',
  }
);

const queryAllIndexesHelpText = i18n.translate(
  'visTypeTimeseries.indexPatternSelect.queryAllIndexesText',
  {
    defaultMessage: 'To query all indexes use *',
  }
);

const indexPatternLabel = i18n.translate('visTypeTimeseries.indexPatternSelect.label', {
  defaultMessage: 'Index pattern',
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
  const [fetchedIndex, setFetchedIndex] = useState<FetchedIndexPattern | null>();
  const useKibanaIndices = Boolean(panelModel?.[USE_KIBANA_INDEXES_KEY]);
  const Component = useKibanaIndices ? ComboBoxSelect : FieldTextSelect;

  const onIndexChange = useCallback(
    (index: IndexPatternObject) => {
      onChange({
        [indexPatternName]: index,
      });
    },
    [indexPatternName, onChange]
  );

  const onModeChange = useCallback(
    (useKibanaIndexes: boolean, index?: FetchedIndexPattern) => {
      onChange({
        [USE_KIBANA_INDEXES_KEY]: useKibanaIndexes,
        [indexPatternName]: index?.indexPattern?.id
          ? {
              id: index.indexPattern.id,
            }
          : '',
      });
    },
    [onChange, indexPatternName]
  );

  useEffect(() => {
    async function fetchIndex() {
      const { indexPatterns } = getDataStart();

      setFetchedIndex(
        value
          ? await fetchIndexPattern(value, indexPatterns)
          : {
              indexPattern: undefined,
              indexPatternString: undefined,
            }
      );
    }

    fetchIndex();
  }, [value]);

  if (!fetchedIndex) {
    return null;
  }

  return (
    <EuiFormRow
      id={htmlId('indexPattern')}
      label={indexPatternLabel}
      helpText={
        !value && defaultIndexPatternHelpText + (!useKibanaIndices ? queryAllIndexesHelpText : '')
      }
      labelAppend={
        value &&
        allowIndexSwitchingMode &&
        isStringTypeIndexPattern(value) && (
          <MigrationPopover
            onModeChange={onModeChange}
            fetchedIndex={fetchedIndex}
            useKibanaIndices={useKibanaIndices}
          />
        )
      }
    >
      <Component
        fetchedIndex={fetchedIndex}
        disabled={disabled}
        allowSwitchMode={allowIndexSwitchingMode}
        onIndexChange={onIndexChange}
        onModeChange={onModeChange}
        placeholder={panelModel?.default_index_pattern ?? ''}
        data-test-subj="metricsIndexPatternInput"
      />
    </EuiFormRow>
  );
};
