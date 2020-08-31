/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createSelectHandler } from '../lib/create_select_handler';
import { GroupBySelect } from './group_by_select';
import PropTypes from 'prop-types';
import React from 'react';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { QueryBarWrapper } from '../query_bar_wrapper';

export const SplitByFilter = (props) => {
  const { onChange, uiRestrictions, indexPattern } = props;
  const defaults = { filter: { language: getDefaultQueryLanguage(), query: '' } };
  const model = { ...defaults, ...props.model };
  const htmlId = htmlIdGenerator();
  const handleSelectChange = createSelectHandler(onChange);
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
            onChange={handleSelectChange('split_mode')}
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
