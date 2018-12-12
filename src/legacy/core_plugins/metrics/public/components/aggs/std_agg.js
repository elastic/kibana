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
import FieldSelect from './field_select';
import AggRow from './agg_row';
import createChangeHandler from '../lib/create_change_handler';
import createSelectHandler from '../lib/create_select_handler';
import { htmlIdGenerator, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFormLabel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

function StandardAgg(props) {
  const { model, panel, series, fields } = props;

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  let restrict = 'numeric';
  if (model.type === 'cardinality') {
    restrict = 'none';
  }

  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const htmlId = htmlIdGenerator();

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
    >
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="tsvb.stdAgg.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <AggSelect
            id={htmlId('aggregation')}
            panelType={props.panel.type}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
            fullWidth
          />
        </EuiFlexItem>

        {
          model.type !== 'count'
            ? (
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('field')}
                  label={(<FormattedMessage
                    id="tsvb.stdAgg.fieldLabel"
                    defaultMessage="Field"
                  />)}
                  fullWidth
                >
                  <FieldSelect
                    fields={fields}
                    type={model.type}
                    restrict={restrict}
                    indexPattern={indexPattern}
                    value={model.field}
                    onChange={handleSelectChange('field')}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ) : null
        }

      </EuiFlexGroup>
    </AggRow>
  );

}

StandardAgg.propTypes = {
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

export default StandardAgg;
