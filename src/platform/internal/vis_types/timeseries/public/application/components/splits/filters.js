/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { GroupBySelect } from './group_by_select';
import { FilterItems } from './filter_items';
import PropTypes from 'prop-types';
import React from 'react';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const RESET_STATE = {
  split_filters: undefined,
};

export const SplitByFilters = (props) => {
  const { onChange, model, uiRestrictions, indexPattern } = props;
  const htmlId = htmlIdGenerator();
  return (
    <div>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('group')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.splits.filters.groupByLabel"
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
      </EuiFlexGroup>

      <FilterItems
        name="split_filters"
        model={model}
        onChange={onChange}
        indexPatterns={indexPattern}
      />
    </div>
  );
};

SplitByFilters.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  uiRestrictions: PropTypes.object,
  indexPatterns: PropTypes.array,
};
