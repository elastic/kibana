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

import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

export const AdvancedOptions = ({
  isVisible,
  indexPatternId,
  toggleAdvancedOptions,
  onChangeIndexPatternId,
}) => (
  <div>
    <EuiButtonEmpty
      iconType={isVisible ? 'arrowDown' : 'arrowRight'}
      onClick={toggleAdvancedOptions}
    >
      { isVisible
        ? (<span>Hide advanced options</span>)
        : (<span>Show advanced options</span>)
      }

    </EuiButtonEmpty>
    <EuiSpacer size="xs"/>
    { isVisible ?
      <EuiForm>
        <EuiFormRow
          label="Custom index pattern ID"
          helpText={
            <span>
              Kibana will provide a unique identifier for each index pattern.
              If you do not want to use this unique ID, enter a custom one.
            </span>
          }
        >
          <EuiFieldText
            name="indexPatternId"
            data-test-subj="createIndexPatternIdInput"
            value={indexPatternId}
            onChange={onChangeIndexPatternId}
            placeholder="custom-index-pattern-id"
          />
        </EuiFormRow>
      </EuiForm>
      : null
    }
  </div>
);
