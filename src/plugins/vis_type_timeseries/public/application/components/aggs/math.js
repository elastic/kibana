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

import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { AggRow } from './agg_row';
import { AggSelect } from './agg_select';

import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import { CalculationVars, newVariable } from './vars';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiTextArea,
  EuiLink,
  EuiFormRow,
  EuiCode,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

const checkModel = (model) => Array.isArray(model.variables) && model.script !== undefined;

export function MathAgg(props) {
  const { siblings, model } = props;
  const htmlId = htmlIdGenerator();

  const handleChange = createChangeHandler(props.onChange, model);
  const handleSelectChange = createSelectHandler(handleChange);
  const handleTextChange = createTextHandler(handleChange);

  useEffect(() => {
    if (!checkModel(model)) {
      handleChange({
        variables: [newVariable()],
        script: '',
      });
    }
  }, [handleChange, model]);

  return (
    <AggRow
      disableDelete={props.disableDelete}
      model={props.model}
      onAdd={props.onAdd}
      onDelete={props.onDelete}
      siblings={props.siblings}
      dragHandleProps={props.dragHandleProps}
    >
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('aggregation')}>
            <FormattedMessage
              id="visTypeTimeseries.math.aggregationLabel"
              defaultMessage="Aggregation"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <AggSelect
            id={htmlId('aggregation')}
            siblings={props.siblings}
            value={model.type}
            onChange={handleSelectChange('type')}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormLabel htmlFor={htmlId('variables')}>
            <FormattedMessage
              id="visTypeTimeseries.math.variablesLabel"
              defaultMessage="Variables"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <CalculationVars
            id={htmlId('variables')}
            metrics={siblings}
            onChange={handleChange}
            name="variables"
            model={model}
            includeSiblings={true}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            id="mathExpressionInput"
            label={
              <FormattedMessage
                id="visTypeTimeseries.math.expressionLabel"
                defaultMessage="Expression"
              />
            }
            fullWidth
            helpText={
              <FormattedMessage
                id="visTypeTimeseries.math.expressionDescription"
                defaultMessage="This field uses basic math expressions (see {link}) - Variables are keys on the {params} object,
                i.e. {paramsName} To access all the data use {paramsValues} for an array of the values and {paramsTimestamps} for
                an array of the timestamps. {paramsTimestamp} is available for the current bucket's timestamp,
                {paramsIndex} is available for the current bucket's index, and {paramsInterval}s available for
                the interval in milliseconds."
                values={{
                  link: (
                    <EuiLink
                      href="https://github.com/elastic/tinymath/blob/master/docs/functions.md"
                      target="_blank"
                    >
                      <FormattedMessage
                        id="visTypeTimeseries.math.expressionDescription.tinyMathLinkText"
                        defaultMessage="TinyMath"
                      />
                    </EuiLink>
                  ),
                  params: <EuiCode>params</EuiCode>,
                  paramsName: <EuiCode>params.&lt;name&gt;</EuiCode>,
                  paramsValues: <EuiCode>params._all.&lt;name&gt;.values</EuiCode>,
                  paramsTimestamps: <EuiCode>params._all.&lt;name&gt;.timestamps</EuiCode>,
                  paramsTimestamp: <EuiCode>params._timestamp</EuiCode>,
                  paramsIndex: <EuiCode>params._index</EuiCode>,
                  paramsInterval: <EuiCode>params._interval</EuiCode>,
                }}
              />
            }
          >
            <EuiTextArea
              data-test-subj="mathExpression"
              onChange={handleTextChange('script')}
              fullWidth
              value={model.script}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
}

MathAgg.propTypes = {
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
