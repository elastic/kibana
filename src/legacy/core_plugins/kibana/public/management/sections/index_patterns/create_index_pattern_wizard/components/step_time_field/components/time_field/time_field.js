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

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

export const TimeField = ({
  isVisible,
  fetchTimeFields,
  timeFieldOptions,
  isLoading,
  selectedTimeField,
  onTimeFieldChanged,
}) => (
  <EuiForm>
    {isVisible ? (
      <EuiFormRow
        label={
          <EuiFlexGroup gutterSize="xs" justifyContent="spaceBetween" alignItems="center">
            <EuiFlexItem grow={false}>
              <span>
                <FormattedMessage
                  id="kbn.management.createIndexPattern.stepTime.fieldHeader"
                  defaultMessage="Time Filter field name"
                />
              </span>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {isLoading ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiLink className="timeFieldRefreshButton" onClick={fetchTimeFields}>
                  <FormattedMessage
                    id="kbn.management.createIndexPattern.stepTime.refreshButton"
                    defaultMessage="Refresh"
                  />
                </EuiLink>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        helpText={
          <div>
            <p>
              <FormattedMessage
                id="kbn.management.createIndexPattern.stepTime.fieldLabel"
                defaultMessage="The Time Filter will use this field to filter your data by time."
              />
            </p>
            <p>
              <FormattedMessage
                id="kbn.management.createIndexPattern.stepTime.fieldWarningLabel"
                defaultMessage="You can choose not to have a time field, but you will not be able to narrow down your data by a time range."
              />
            </p>
          </div>
        }
      >
        {isLoading ? (
          <EuiSelect
            name="timeField"
            data-test-subj="createIndexPatternTimeFieldSelect"
            options={[
              {
                text: i18n.translate(
                  'kbn.management.createIndexPattern.stepTime.field.loadingDropDown',
                  {
                    defaultMessage: 'Loading…',
                  }
                ),
                value: '',
              },
            ]}
            disabled={true}
          />
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
    ) : (
      <EuiText>
        <p>
          <FormattedMessage
            id="kbn.management.createIndexPattern.stepTime.field.noTimeFieldsLabel"
            defaultMessage="The indices which match this index pattern don't contain any time fields."
          />
        </p>
      </EuiText>
    )}
  </EuiForm>
);
