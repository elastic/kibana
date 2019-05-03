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
import FieldSelect from './aggs/field_select';
import createSelectHandler from './lib/create_select_handler';
import createTextHandler from './lib/create_text_handler';
import YesNo from './yes_no';
import {
  htmlIdGenerator,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormLabel,
  EuiSpacer,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { ES_TYPES } from '../../common/es_types';

const RESTRICT_FIELDS = [ES_TYPES.DATE];

export const IndexPattern = props => {
  const { fields, prefix } = props;
  const handleSelectChange = createSelectHandler(props.onChange);
  const handleTextChange = createTextHandler(props.onChange);
  const timeFieldName = `${prefix}time_field`;
  const indexPatternName = `${prefix}index_pattern`;
  const intervalName = `${prefix}interval`;
  const dropBucketName = `${prefix}drop_last_bucket`;

  const defaults = {
    default_index_pattern: '',
    [indexPatternName]: '*',
    [intervalName]: 'auto',
    [dropBucketName]: 1
  };

  const htmlId = htmlIdGenerator();

  const model = { ...defaults, ...props.model };
  return (
    <div className={props.className}>
      <EuiFlexGroup responsive={false} wrap={true}>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('indexPattern')}
            label={(<FormattedMessage
              id="tsvb.indexPatternLabel"
              defaultMessage="Index pattern"
            />)}
            helpText={(model.default_index_pattern && !model[indexPatternName] && <FormattedMessage
              id="tsvb.indexPattern.searchByDefaultIndex"
              defaultMessage="Default index pattern is used. To query all indexes use *"
            />)}
            fullWidth
          >
            <EuiFieldText
              data-test-subj="metricsIndexPatternInput"
              disabled={props.disabled}
              placeholder={model.default_index_pattern}
              onChange={handleTextChange(indexPatternName, '*')}
              value={model[indexPatternName]}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id={htmlId('timeField')}
            label={(<FormattedMessage
              id="tsvb.indexPattern.timeFieldLabel"
              defaultMessage="Time field"
            />)}
            fullWidth
          >
            <FieldSelect
              data-test-subj="metricsIndexPatternFieldsSelect"
              restrict={RESTRICT_FIELDS}
              value={model[timeFieldName]}
              disabled={props.disabled}
              onChange={handleSelectChange(timeFieldName)}
              indexPattern={model[indexPatternName]}
              fields={fields}
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow
            id={htmlId('interval')}
            label={(<FormattedMessage
              id="tsvb.indexPattern.intervalLabel"
              defaultMessage="Interval"
            />)}
            helpText={(<FormattedMessage
              id="tsvb.indexPattern.intervalHelpText"
              defaultMessage="Examples: auto, 1m, 1d, 7d, 1y, >=1m"
              description="auto, 1m, 1d, 7d, 1y, >=1m are required values and must not be translated."
            />)}
          >
            <EuiFieldText
              disabled={props.disabled}
              onChange={handleTextChange(intervalName, 'auto')}
              value={model[intervalName]}
              placeholder={'auto'}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormLabel>
            <FormattedMessage
              id="tsvb.indexPattern.dropLastBucketLabel"
              defaultMessage="Drop last bucket?"
            />
          </EuiFormLabel>
          <EuiSpacer size="s" />
          <YesNo
            value={model[dropBucketName]}
            name={dropBucketName}
            onChange={props.onChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

IndexPattern.defaultProps = {
  prefix: '',
  disabled: false,
};

IndexPattern.propTypes = {
  model: PropTypes.object.isRequired,
  fields: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  prefix: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string
};
