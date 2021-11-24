/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GroupBySelect } from './group_by_select';
import PropTypes from 'prop-types';
import React from 'react';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { QueryBarWrapper } from '../query_bar_wrapper';

const RESET_STATE = {
  filter: undefined,
};

export const SplitByFilter = (props) => {
  const { onChange, uiRestrictions, indexPattern } = props;
  const defaults = { filter: { language: getDefaultQueryLanguage(), query: '' } };
  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFormRow
          id={htmlId('group')}
          label={
            <FormattedMessage
              id="visTypeTimeseries.splits.filter.groupByLabel"
              defaultMessage="Group by"
            />
          }
        >
          <GroupBySelect
            value={model.split_mode}
            onChange={([{ value: newSplitMode = null }]) => {
              onChange({
                split_mode: newSplitMode,
                ...RESET_STATE,
              });
            }}
            uiRestrictions={uiRestrictions}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFormRow
          id={htmlId('query')}
          label={
            <FormattedMessage
              id="visTypeTimeseries.splits.filter.queryStringLabel"
              defaultMessage="Query string"
            />
          }
        >
          <QueryBarWrapper
            query={{
              language: model.filter.language || getDefaultQueryLanguage(),
              query: model.filter.query || '',
            }}
            onChange={(filter) => onChange({ filter })}
            indexPatterns={[indexPattern]}
          />
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SplitByFilter.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  uiRestrictions: PropTypes.object,
  indexPatterns: PropTypes.string,
};
