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
import PropTypes from 'prop-types';
import React from 'react';
import { htmlIdGenerator, EuiFlexItem, EuiFormRow, EuiToolTip, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { YesNo } from './yes_no';
import { getDefaultQueryLanguage } from './lib/get_default_query_language';
import { QueryBarWrapper } from './query_bar_wrapper';

export function SeriesConfigQueryBarWithIgnoreGlobalFilter({
  panel,
  model,
  onChange,
  indexPatternForQuery,
}) {
  const htmlId = htmlIdGenerator();
  const yesNoOption = (
    <YesNo
      disabled={Boolean(panel.ignore_global_filter)}
      value={model.ignore_global_filter}
      name="ignore_global_filter"
      onChange={onChange}
    />
  );
  return (
    <EuiFlexGroup margin="s">
      <EuiFlexItem grow={true}>
        <EuiFormRow
          id={htmlId('filterInput')}
          label={
            <FormattedMessage
              id="visTypeTimeseries.seriesConfig.filterLabel"
              defaultMessage="Filter"
            />
          }
          fullWidth
        >
          <QueryBarWrapper
            query={{
              language:
                model.filter && model.filter.language
                  ? model.filter.language
                  : getDefaultQueryLanguage(),
              query: model.filter && model.filter.query ? model.filter.query : '',
            }}
            onChange={(filter) => onChange({ filter })}
            indexPatterns={[indexPatternForQuery]}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow
          id={htmlId('seriesIgnoreGlobalFilter')}
          label={
            <FormattedMessage
              id="visTypeTimeseries.seriesConfig.ignoreGlobalFilterLabel"
              defaultMessage="Ignore global filter?"
            />
          }
          fullWidth
        >
          {panel.ignore_global_filter ? (
            <EuiToolTip
              content={
                <FormattedMessage
                  id="visTypeTimeseries.seriesConfig.ignoreGlobalFilterDisabledTooltip"
                  defaultMessage="This is disabled because the global filters are being ignored in the panel options."
                />
              }
            >
              {yesNoOption}
            </EuiToolTip>
          ) : (
            yesNoOption
          )}
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

SeriesConfigQueryBarWithIgnoreGlobalFilter.propTypes = {
  onChange: PropTypes.func,
  model: PropTypes.object,
  panel: PropTypes.object,
  indexPatternForQuery: PropTypes.string,
};
