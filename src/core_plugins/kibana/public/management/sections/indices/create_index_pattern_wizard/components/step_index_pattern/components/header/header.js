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
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
} from '@elastic/eui';

import { ReactI18n } from '@kbn/i18n';

const { I18nContext, FormattedMessage } = ReactI18n;

export const Header = ({
  isInputInvalid,
  errors,
  characterList,
  query,
  onQueryChanged,
  goToNextStep,
  isNextStepDisabled,
  ...rest
}) => (
  <div {...rest}>
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="kbn.management.indexPattern.create.step.header"
          defaultMessage="Step 1 of 2: Define index pattern"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="m"/>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiForm
          isInvalid={isInputInvalid}
        >
          <EuiFormRow
            label={<FormattedMessage
              id="kbn.management.indexPattern.create.step.indexPattern.label"
              defaultMessage="Index pattern"
            />}
            isInvalid={isInputInvalid}
            error={errors}
            helpText={
              <div>
                <p>
                  <FormattedMessage
                    id="kbn.management.indexPattern.create.step.indexPattern.allow.label"
                    defaultMessage="You can use a {asterisk} as a wildcard in your index pattern."
                    values={{ asterisk: <strong>*</strong> }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="kbn.management.indexPattern.create.step.indexPattern.disallow.label"
                    defaultMessage="You can't use spaces or the characters {characterList}."
                    values={{ characterList: <strong>{characterList}</strong> }}
                  />
                </p>
              </div>
            }
          >
            <I18nContext>
              {intl => (
                <EuiFieldText
                  name="indexPattern"
                  placeholder={intl.formatMessage({
                    id: 'kbn.management.indexPattern.create.step.indexPattern.placeholder',
                    defaultMessage: 'index-name-*' })}
                  value={query}
                  isInvalid={isInputInvalid}
                  onChange={onQueryChanged}
                  data-test-subj="createIndexPatternNameInput"
                />
              )}
            </I18nContext>
          </EuiFormRow>
        </EuiForm>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          iconType="arrowRight"
          onClick={() => goToNextStep(query)}
          isDisabled={isNextStepDisabled}
          data-test-subj="createIndexPatternGoToStep2Button"
        >
          <FormattedMessage
            id="kbn.management.indexPattern.create.step.nextStep.button"
            defaultMessage="Next step"
          />
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
