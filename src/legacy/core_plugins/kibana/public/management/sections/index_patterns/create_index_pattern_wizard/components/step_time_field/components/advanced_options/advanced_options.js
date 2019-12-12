/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the e633644c43a0a0271e0b6c32c382ce1db6b413c3 commit
 *
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

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

import { EuiForm, EuiFormRow, EuiFieldText, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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
      {isVisible ? (
        <FormattedMessage
          id="kbn.management.createIndexPattern.stepTime.options.hideButton"
          defaultMessage="Hide advanced options"
        />
      ) : (
        <FormattedMessage
          id="kbn.management.createIndexPattern.stepTime.options.showButton"
          defaultMessage="Show advanced options"
        />
      )}
    </EuiButtonEmpty>
    <EuiSpacer size="xs" />
    {isVisible ? (
      <EuiForm>
        <EuiFormRow
          label={
            <FormattedMessage
              id="kbn.management.createIndexPattern.stepTime.options.patternHeader"
              defaultMessage="Custom index pattern ID"
            />
          }
          helpText={
            <FormattedMessage
              id="kbn.management.createIndexPattern.stepTime.options.patternLabel"
              defaultMessage="NetMon will provide a unique identifier for each index pattern. If you do not want to use this unique ID,
            enter a custom one."
            />
          }
        >
          <EuiFieldText
            name="indexPatternId"
            data-test-subj="createIndexPatternIdInput"
            value={indexPatternId}
            onChange={onChangeIndexPatternId}
            placeholder={i18n.translate(
              'kbn.management.createIndexPattern.stepTime.options.patternPlaceholder',
              {
                defaultMessage: 'custom-index-pattern-id',
              }
            )}
          />
        </EuiFormRow>
      </EuiForm>
    ) : null}
  </div>
);
