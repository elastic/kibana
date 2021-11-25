/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createSelectHandler } from '../lib/create_select_handler';
import { GroupBySelect } from './group_by_select';
import PropTypes from 'prop-types';
import React from 'react';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiCode,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

export const SplitUnsupported = (props) => {
  const { onChange, model, uiRestrictions } = props;
  const htmlId = htmlIdGenerator();
  const handleSelectChange = createSelectHandler(onChange);
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFormRow
          id={htmlId('group')}
          label={
            <FormattedMessage
              id="visTypeTimeseries.splits.everything.groupByLabel"
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
        <EuiTitle className="tvbAggRow__unavailable" size="xxxs">
          <span>
            <FormattedMessage
              id="visTypeTimeseries.unsupportedSplit.splitIsUnsupportedDescription"
              defaultMessage="Split by {modelType} is unsupported."
              values={{ modelType: <EuiCode>{model.split_mode}</EuiCode> }}
            />
          </span>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SplitUnsupported.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
  uiRestrictions: PropTypes.object,
};
