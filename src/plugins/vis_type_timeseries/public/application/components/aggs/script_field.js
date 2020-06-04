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
import React from 'react';
import PropTypes from 'prop-types';
import {
  htmlIdGenerator,
  EuiSpacer,
  EuiTextArea,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiCode,
} from '@elastic/eui';
import { SCRIPTED_FIELD_VALUE } from '../../../../common/constants';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const ScriptField = ({ model, onChange }) => {
  if (model.type === 'count' || model.field !== SCRIPTED_FIELD_VALUE) {
    return null;
  }
  const htmlId = htmlIdGenerator();

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            id={htmlId('script')}
            label={i18n.translate('visTypeTimeseries.scriptField.label', {
              defaultMessage: 'Painless Script',
            })}
            helpText={
              <div>
                <FormattedMessage
                  id="visTypeTimeseries.scriptField.helpText"
                  defaultMessage="Warning, using scripts can be resource intensive. Access fields with{example}"
                  values={{
                    example: (
                      <EuiCode>
                        doc[&#39;some.field.path&#39;].size() &gt; 0 ?
                        doc[&#39;some.field.path&#39;].value / 100 : null
                      </EuiCode>
                    ),
                  }}
                />
              </div>
            }
          >
            <EuiTextArea fullWidth onChange={onChange} value={model.script} rows={3} />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

ScriptField.propTypes = {
  model: PropTypes.object,
  onChange: PropTypes.func,
};
