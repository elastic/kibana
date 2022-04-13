/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useContext, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiFormRow, EuiText, EuiLink, htmlIdGenerator } from '@elastic/eui';
import { getCoreStart } from '../../../../services';
import { PanelModelContext } from '../../../contexts/panel_model_context';

import { FieldTextSelect } from './field_text_select';
import { ComboBoxSelect } from './combo_box_select';

import type { IndexPatternValue, FetchedIndexPattern } from '../../../../../common/types';
import { USE_KIBANA_INDEXES_KEY } from '../../../../../common/constants';
import type { DataView } from '../../../../../../../data_views/public';

export interface IndexPatternSelectProps {
  indexPatternName: string;
  onChange: Function;
  disabled?: boolean;
  allowIndexSwitchingMode?: boolean;
  fetchedIndex:
    | (FetchedIndexPattern & {
        defaultIndex?: DataView | null;
      })
    | null;
}

const queryAllIndicesHelpText = (
  <FormattedMessage
    id="visTypeTimeseries.indexPatternSelect.queryAllIndicesText"
    defaultMessage="To query all indices, use {asterisk}."
    values={{
      asterisk: <strong>*</strong>,
    }}
  />
);

const getIndexPatternHelpText = (useKibanaIndices: boolean) => (
  <FormattedMessage
    id="visTypeTimeseries.indexPatternSelect.defaultDataViewText"
    defaultMessage="Using the default data view. {queryAllIndicesHelpText}"
    values={{
      queryAllIndicesHelpText: useKibanaIndices ? '' : queryAllIndicesHelpText,
    }}
  />
);

const indexPatternLabel = i18n.translate('visTypeTimeseries.indexPatternSelect.label', {
  defaultMessage: 'Data view',
});

export const IndexPatternSelect = ({
  indexPatternName,
  onChange,
  disabled,
  fetchedIndex,
  allowIndexSwitchingMode,
}: IndexPatternSelectProps) => {
  const htmlId = htmlIdGenerator();
  const panelModel = useContext(PanelModelContext);

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
      helpText={fetchedIndex.defaultIndex && getIndexPatternHelpText(useKibanaIndices)}
      labelAppend={
        !useKibanaIndices && fetchedIndex.indexPatternString && !fetchedIndex.indexPattern ? (
          <EuiLink onClick={navigateToCreateIndexPatternPage}>
            <EuiText size="xs">
              <FormattedMessage
                id="visTypeTimeseries.indexPatternSelect.createDataViewText"
                defaultMessage="Create data view"
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
        placeholder={fetchedIndex.defaultIndex?.title ?? ''}
        data-test-subj="metricsIndexPatternInput"
      />
    </EuiFormRow>
  );
};
