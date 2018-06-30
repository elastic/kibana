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

import './time_field.css';

import {
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSelect,
  EuiText,
  EuiLoadingSpinner,
} from '@elastic/eui';

import { ReactI18n } from '@kbn/i18n';

const { I18nContext, FormattedMessage } = ReactI18n;

export const TimeField = ({
  isVisible,
  fetchTimeFields,
  timeFieldOptions,
  isLoading,
  selectedTimeField,
  onTimeFieldChanged,
}) => (
  <EuiForm>
    { isVisible ?
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <span>
                <FormattedMessage
                  id="kbn.management.indexPattern.create.stepTime.field.header"
                  defaultMessage="Time Filter field name"
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              { isLoading ? (
                <EuiLoadingSpinner size="s"/>
              )
                : (
                  <EuiLink
                    className="timeFieldRefreshButton"
                    onClick={fetchTimeFields}
                  >
                    <FormattedMessage
                      id="kbn.management.indexPattern.create.stepTime.refresh.button"
                      defaultMessage="Refresh"
                    />
                  </EuiLink>
                )
              }
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        helpText={
          <div>
            <p>
              <FormattedMessage
                id="kbn.management.indexPattern.create.stepTime.field.label"
                //eslint-disable-next-line max-len
                defaultMessage="The Time Filter will use this field to filter your data by time.{newLine}You can choose not to have a time field, but you will not be able to narrow down your data by a time range."
                values={{ newLine: <br/> }}
              />
            </p>
          </div>
        }
      >
        { isLoading ? (
          <I18nContext>
            {intl => (
              <EuiSelect
                name="timeField"
                data-test-subj="createIndexPatternTimeFieldSelect"
                options={[
                  {
                    text: intl.formatMessage({
                      id: 'kbn.management.indexPattern.create.stepTime.field.loading.dropDown',
                      defaultMessage: 'Loading...' }),
                    value: ''
                  }
                ]}
                disabled={true}
              />
            )}
          </I18nContext>
        ) : (
          <EuiSelect
            name="timeField"
            data-test-subj="createIndexPatternTimeFieldSelect"
            options={timeFieldOptions}
            isLoading={isLoading}
            disabled={isLoading}
            value={selectedTimeField}
            onChange={onTimeFieldChanged}
          />
        )}
      </EuiFormRow>
      :
      <EuiText>
        <p>
          <FormattedMessage
            id="kbn.management.indexPattern.create.stepTime.field.noTimeFields.label"
            defaultMessage="The indices which match this index pattern don't contain any time fields."
          />
        </p>
      </EuiText>
    }
  </EuiForm>
);
