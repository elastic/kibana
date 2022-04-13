/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { AggSelect } from './agg_select';
import { MetricSelect } from './metric_select';
import { AggRow } from './agg_row';
import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createNumberHandler } from '../lib/create_number_handler';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiFormRow,
  EuiSpacer,
  EuiFieldNumber,
  EuiIconTip,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getIndexPatternKey } from '../../../../common/index_patterns_utils';

const SERIAL_DIFF_DEFAULT_VALUE = 1;

export const SerialDiffAgg = (props) => {
  const { siblings, fields, indexPattern, model } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleNumberChange = createNumberHandler(handleChange);

  const htmlId = htmlIdGenerator();

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
      dragHandleProps={props.dragHandleProps}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="visTypeTimeseries.serialDiff.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <AggSelect
            id={htmlId('aggregation')}
            panelType={props.panel.type}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('metric')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.serialDiff.metricLabel"
                defaultMessage="Metric"
              />
            }
          >
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              fields={fields[getIndexPatternKey(indexPattern)]}
              value={model.field}
              exclude={[TSVB_METRIC_TYPES.TOP_HIT]}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('lag')}
            label={
              <>
                <FormattedMessage
                  id="visTypeTimeseries.serialDiff.lagLabel"
                  defaultMessage="Lag"
                  description="'Lag' refers to the parameter name of the serial diff translation
                https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-serialdiff-aggregation.html.
                This should only be translated if there is a reasaonable word explaining what that parameter does."
                />{' '}
                <EuiIconTip
                  position="right"
                  content={
                    <FormattedMessage
                      id="visTypeTimeseries.serialDiff.lagLabel.hint"
                      defaultMessage="The historical bucket to subtract from the current value. Must be a positive, non-zero integer"
                    />
                  }
                  type="questionInCircle"
                />
              </>
            }
          >
            <EuiFieldNumber
              className="tvbAgg__input"
              placeholder={SERIAL_DIFF_DEFAULT_VALUE}
              onChange={handleNumberChange('lag', { isClearable: true })}
              value={model.lag}
              min={1}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
};

SerialDiffAgg.propTypes = {
  disableDelete: PropTypes.bool,
  fields: PropTypes.object,
  indexPattern: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};
