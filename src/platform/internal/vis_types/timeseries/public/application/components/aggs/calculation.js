/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { AggRow } from './agg_row';
import { AggSelect } from './agg_select';

import { createChangeHandler } from '../lib/create_change_handler';
import { createSelectHandler } from '../lib/create_select_handler';
import { createTextHandler } from '../lib/create_text_handler';
import { CalculationVars, newVariable } from './vars';
import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiTextArea,
  EuiFormRow,
  EuiCode,
  EuiSpacer,
} from '@elastic/eui';

const checkModel = (model) => Array.isArray(model.variables) && model.script !== undefined;

export function CalculationAgg(props) {
  const htmlId = htmlIdGenerator();
  const { siblings, model, indexPattern, fields } = props;

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
              id="visTypeTimeseries.calculation.aggregationLabel"
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
          <EuiFormLabel htmlFor={htmlId('variables')}>
            <FormattedMessage
              id="visTypeTimeseries.calculation.variablesLabel"
              defaultMessage="Variables"
            />
          </EuiFormLabel>
          <EuiSpacer size="xs" />
          <CalculationVars
            id={htmlId('variables')}
            metrics={siblings}
            indexPattern={indexPattern}
            fields={fields}
            onChange={handleChange}
            name="variables"
            model={model}
            exclude={[TSVB_METRIC_TYPES.TOP_HIT]}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('painless')}
            label={
              <FormattedMessage
                id="visTypeTimeseries.calculation.painlessScriptLabel"
                defaultMessage="Painless Script"
              />
            }
            fullWidth
            helpText={
              <div>
                <FormattedMessage
                  id="visTypeTimeseries.calculation.painlessScriptDescription"
                  defaultMessage="Variables are keys on the {params} object, i.e. {paramsName}. To access the bucket
                    interval (in milliseconds) use {paramsInterval}."
                  values={{
                    params: <EuiCode>params</EuiCode>,
                    paramsName: <EuiCode>params.&lt;name&gt;</EuiCode>,
                    paramsInterval: <EuiCode>params._interval</EuiCode>,
                  }}
                />
              </div>
            }
          >
            <EuiTextArea onChange={handleTextChange('script')} value={model.script} fullWidth />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </AggRow>
  );
}

CalculationAgg.propTypes = {
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
