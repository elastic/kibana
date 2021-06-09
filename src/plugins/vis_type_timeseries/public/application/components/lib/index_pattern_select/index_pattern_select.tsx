/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiFormRow, EuiText, EuiLink, htmlIdGenerator } from '@elastic/eui';
import { getCoreStart } from '../../../../services';
import { PanelModelContext } from '../../../contexts/panel_model_context';

import { isStringTypeIndexPattern } from '../../../../../common/index_patterns_utils';

import { FieldTextSelect } from './field_text_select';
import { ComboBoxSelect } from './combo_box_select';

import type { IndexPatternValue, FetchedIndexPattern } from '../../../../../common/types';
import { DefaultIndexPatternContext } from '../../../contexts/default_index_context';
import { USE_KIBANA_INDEXES_KEY } from '../../../../../common/constants';

interface IndexPatternSelectProps {
  value: IndexPatternValue;
  indexPatternName: string;
  onChange: Function;
  disabled?: boolean;
  allowIndexSwitchingMode?: boolean;
  fetchedIndex: FetchedIndexPattern | null;
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
  fetchedIndex,
  allowIndexSwitchingMode,
}: IndexPatternSelectProps) => {
  const htmlId = htmlIdGenerator();
  const panelModel = useContext(PanelModelContext);
  const defaultIndex = useContext(DefaultIndexPatternContext);

  const useKibanaIndices = Boolean(panelModel?.[USE_KIBANA_INDEXES_KEY]);
  const Component = useKibanaIndices ? ComboBoxSelect : FieldTextSelect;

  const onIndexChange = useCallback(
    (index: IndexPatternValue) => {
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

  const navigateToCreateIndexPatternPage = useCallback(() => {
    const coreStart = getCoreStart();

    coreStart.application.navigateToApp('management', {
      path: `/kibana/indexPatterns/create?name=${fetchedIndex!.indexPatternString ?? ''}`,
    });
  }, [fetchedIndex]);

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
        isStringTypeIndexPattern(value) &&
        !fetchedIndex.indexPattern ? (
          <EuiLink onClick={navigateToCreateIndexPatternPage}>
            <EuiText size="xs">
              <FormattedMessage
                id="visTypeTimeseries.indexPatternSelect.createIndexPatternText"
                defaultMessage="Create index pattern"
              />
            </EuiText>
          </EuiLink>
        ) : null
      }
    >
      <Component
        fetchedIndex={fetchedIndex}
        disabled={disabled}
        allowSwitchMode={allowIndexSwitchingMode}
        onIndexChange={onIndexChange}
        onModeChange={onModeChange}
        placeholder={defaultIndex?.title ?? ''}
        data-test-subj="metricsIndexPatternInput"
      />
    </EuiFormRow>
  );
};
