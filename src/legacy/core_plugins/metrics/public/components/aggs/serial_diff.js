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
import AggSelect from './agg_select';
import MetricSelect from './metric_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import createNumberHandler from '../lib/create_number_handler';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormLabel, EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const SerialDiffAgg = props => {
  const { siblings } = props;
  const defaults = { lag: '' };
  const model = { ...defaults, ...props.model };

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
              id="tsvb.serialDiff.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
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
            label={(<FormattedMessage
              id="tsvb.serialDiff.metricLabel"
              defaultMessage="Metric"
            />)}
          >
            <MetricSelect
              onChange={handleSelectChange('field')}
              metrics={siblings}
              metric={model}
              value={model.field}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('lag')}
            label={(<FormattedMessage
              id="tsvb.serialDiff.lagLabel"
              defaultMessage="Lag"
              description="'Lag' refers to the parameter name of the serial diff translation
                https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline-serialdiff-aggregation.html.
                This should only be translated if there is a reasaonable word explaining what that parameter does."
            />)}
          >
            {/*
              EUITODO: The following input couldn't be converted to EUI because of type mis-match.
              Should it be text or number?
            */}
            <input
              className="tvbAgg__input"
              onChange={handleNumberChange('lag')}
              value={model.lag}
              type="text"
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
  model: PropTypes.object,
  onAdd: PropTypes.func,
  onChange: PropTypes.func,
  onDelete: PropTypes.func,
  panel: PropTypes.object,
  series: PropTypes.object,
  siblings: PropTypes.array,
};
