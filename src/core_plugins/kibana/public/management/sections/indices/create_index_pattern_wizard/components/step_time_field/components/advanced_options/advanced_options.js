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

import { ReactI18n } from '@kbn/i18n';

const { I18nContext, FormattedMessage } = ReactI18n;

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
        ? (
          <span>
            <FormattedMessage
              id="kbn.management.indexPattern.create.stepTime.options.hide.button"
              defaultMessage="Hide advanced options"
            />
          </span>
        )
        : (
          <span>
            <FormattedMessage
              id="kbn.management.indexPattern.create.stepTime.options.show.button"
              defaultMessage="Show advanced options"
            />
          </span>
        )
      }

    </EuiButtonEmpty>
    <EuiSpacer size="xs"/>
    { isVisible ?
      <I18nContext>
        {intl => (
          <EuiForm>
            <EuiFormRow
              label={intl.formatMessage({
                id: 'kbn.management.indexPattern.create.stepTime.options.pattern.header',
                defaultMessage: 'Custom index pattern ID' })}
              helpText={
                <span>
                  <FormattedMessage
                    id="kbn.management.indexPattern.create.stepTime.options.pattern.label"
                    //eslint-disable-next-line max-len
                    defaultMessage="Kibana will provide a unique identifier for each index pattern. If you do not want to use this unique ID, enter a custom one."
                  />
                </span>
              }
            >
              <EuiFieldText
                name="indexPatternId"
                data-test-subj="createIndexPatternIdInput"
                value={indexPatternId}
                onChange={onChangeIndexPatternId}
                placeholder={intl.formatMessage({
                  id: 'kbn.management.indexPattern.create.stepTime.options.pattern.placeholder',
                  defaultMessage: 'custom-index-pattern-id' })}
              />
            </EuiFormRow>
          </EuiForm>
        )}
      </I18nContext>
      : null
    }
  </div>
);
