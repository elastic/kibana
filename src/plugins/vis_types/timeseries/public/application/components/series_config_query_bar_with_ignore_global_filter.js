/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { htmlIdGenerator, EuiFlexItem, EuiFormRow, EuiToolTip, EuiFlexGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
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
      disabled={panel.ignore_global_filter}
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
            data-test-subj="seriesConfigQueryBar"
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
  indexPatternForQuery: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
};
