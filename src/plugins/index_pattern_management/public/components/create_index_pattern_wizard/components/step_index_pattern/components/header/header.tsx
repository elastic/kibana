/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback, useMemo } from 'react';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiSwitchEvent,
  EuiSwitch,
  EuiComboBox,
  EuiComboBoxOptionOption,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { containsIllegalCharacters } from '../../../../lib';
import { indexPatterns } from '../../../../../../../../data/public';

interface HeaderProps {
  isInputInvalid: boolean;
  characterList: string;
  errors: any;
  goToNextStep: (selectedPatterns: string[]) => void;
  isIncludingSystemIndices: boolean;
  isNextStepDisabled: boolean;
  onChangeIncludingSystemIndices: (event: EuiSwitchEvent) => void;
  onQueryChanged: (patterns: string[]) => void;
  selectedPatterns: string[];
  showSystemIndices?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  characterList,
  errors,
  goToNextStep,
  isIncludingSystemIndices,
  isInputInvalid,
  isNextStepDisabled,
  onChangeIncludingSystemIndices,
  onQueryChanged,
  selectedPatterns,
  showSystemIndices = false,
  ...rest
}) => {
  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () => selectedPatterns.map((label) => ({ label })),
    [selectedPatterns]
  );
  const onChange = useCallback(
    (patterns: Array<EuiComboBoxOptionOption<string>>) => {
      const patternList = patterns.map(({ label }) => label);
      onQueryChanged(patternList);
    },
    [onQueryChanged]
  );
  const onCreateOption = useCallback(
    (searchValue) => {
      if (containsIllegalCharacters(searchValue, indexPatterns.ILLEGAL_CHARACTERS)) {
        return false;
      }
      onQueryChanged([...selectedPatterns, searchValue]);
    },
    [onQueryChanged, selectedPatterns]
  );
  return (
    <div {...rest}>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="indexPatternManagement.createIndexPattern.stepHeader"
            defaultMessage="Step 1 of 2: Define an index pattern"
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
              <EuiComboBox
                data-test-subj="createIndexPatternNameInput"
                fullWidth
                isInvalid={isInputInvalid}
                noSuggestions
                onChange={onChange}
                onCreateOption={onCreateOption}
                placeholder={i18n.translate(
                  'indexPatternManagement.createIndexPattern.step.indexPatternPlaceholder',
                  {
                    defaultMessage: 'index-name-*',
                  }
                )}
                selectedOptions={selectedOptions}
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
                  data-test-subj="showSystemAndHiddenIndices"
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
              onClick={() => goToNextStep(selectedPatterns)}
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
};
