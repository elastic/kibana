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
  EuiSwitchEvent,
  EuiSwitch,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

interface HeaderProps {
  isInputInvalid: boolean;
  errors: any;
  characterList: string;
  query: string;
  onQueryChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
  goToNextStep: (query: string) => void;
  isNextStepDisabled: boolean;
  showSystemIndices?: boolean;
  onChangeIncludingSystemIndices: (event: EuiSwitchEvent) => void;
  isIncludingSystemIndices: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isInputInvalid,
  errors,
  characterList,
  query,
  onQueryChanged,
  goToNextStep,
  isNextStepDisabled,
  showSystemIndices = false,
  onChangeIncludingSystemIndices,
  isIncludingSystemIndices,
  ...rest
}) => (
  <div {...rest}>
    <EuiTitle size="s">
      <h2>
        <FormattedMessage
          id="indexPatternManagement.createIndexPattern.stepHeader"
          defaultMessage="Step 1 of 2: Define index pattern"
        />
      </h2>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiForm isInvalid={isInputInvalid}>
          <EuiFormRow
            fullWidth
            label={
              <FormattedMessage
                id="indexPatternManagement.createIndexPattern.step.indexPatternLabel"
                defaultMessage="Index pattern name"
              />
            }
            isInvalid={isInputInvalid}
            error={errors}
            helpText={
              <>
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.indexPattern.allowLabel"
                  defaultMessage="Use an asterisk ({asterisk}) to match multiple indices."
                  values={{ asterisk: <strong>*</strong> }}
                />{' '}
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.indexPattern.disallowLabel"
                  defaultMessage="Spaces and the characters {characterList} are not allowed."
                  values={{ characterList: <strong>{characterList}</strong> }}
                />
              </>
            }
          >
            <EuiFieldText
              name="indexPattern"
              placeholder={i18n.translate(
                'indexPatternManagement.createIndexPattern.step.indexPatternPlaceholder',
                {
                  defaultMessage: 'index-name-*',
                }
              )}
              value={query}
              isInvalid={isInputInvalid}
              onChange={onQueryChanged}
              data-test-subj="createIndexPatternNameInput"
              fullWidth
            />
          </EuiFormRow>

          {showSystemIndices ? (
            <EuiFormRow>
              <EuiSwitch
                label={
                  <FormattedMessage
                    id="indexPatternManagement.createIndexPattern.includeSystemIndicesToggleSwitchLabel"
                    defaultMessage="Include system and hidden indices"
                  />
                }
                id="checkboxShowSystemIndices"
                checked={isIncludingSystemIndices}
                onChange={onChangeIncludingSystemIndices}
              />
            </EuiFormRow>
          ) : null}
        </EuiForm>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow hasEmptyLabelSpace>
          <EuiButton
            fill
            iconSide="right"
            iconType="arrowRight"
            onClick={() => goToNextStep(query)}
            isDisabled={isNextStepDisabled}
            data-test-subj="createIndexPatternGoToStep2Button"
          >
            <FormattedMessage
              id="indexPatternManagement.createIndexPattern.step.nextStepButton"
              defaultMessage="Next step"
            />
          </EuiButton>
        </EuiFormRow>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
