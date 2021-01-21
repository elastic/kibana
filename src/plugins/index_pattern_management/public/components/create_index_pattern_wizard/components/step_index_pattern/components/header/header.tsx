/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useCallback, useMemo, useState } from 'react';

import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButton,
  EuiFieldText,
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
  characterList: string;
  checkIndices?: string[];
  goToNextStep: (selectedPatterns: string[]) => void;
  isIncludingSystemIndices: boolean;
  isNextStepDisabled: boolean;
  onChangeIncludingSystemIndices: (event: EuiSwitchEvent) => void;
  onQueryChanged: (patterns: string[]) => void;
  onTitleChanged: (e: React.ChangeEvent<HTMLInputElement>) => void;
  patternError: boolean;
  selectedPatterns: string[];
  showSystemIndices?: boolean;
  title: string;
  titleError: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  characterList,
  checkIndices,
  goToNextStep,
  isIncludingSystemIndices,
  isNextStepDisabled,
  onChangeIncludingSystemIndices,
  onQueryChanged,
  onTitleChanged,
  patternError,
  selectedPatterns,
  showSystemIndices = false,
  title,
  titleError,
  ...rest
}) => {
  const [isPatternInvalid, setIsPatternInvalid] = useState(patternError);
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
  const onSearchChange = useCallback(
    (searchValue) => {
      if (containsIllegalCharacters(searchValue, indexPatterns.ILLEGAL_CHARACTERS)) {
        return setIsPatternInvalid(true);
      }
      if (isPatternInvalid) {
        return setIsPatternInvalid(false);
      }
    },
    [isPatternInvalid]
  );
  const patternErrorMessage = useMemo(() => {
    const errorsArr = [];
    if (isPatternInvalid) {
      errorsArr.push('This is a bad pattern');
    }
    if (checkIndices) {
      errorsArr.push(...checkIndices);
    }
    return errorsArr;
  }, [checkIndices, isPatternInvalid]);

  const isNextDisabled = useMemo(() => patternErrorMessage.length > 0 || isNextStepDisabled, [
    patternError,
    isNextStepDisabled,
  ]);

  const titleErrorMessage = useMemo(() => {
    return titleError ? 'Index pattern title exists' : false;
  }, [titleError]);
  console.log('RETURN header.tsx', {
    titleError,
    titleErrorMessage,
    patternError,
    patternErrorMessage,
  });
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
      <EuiFlexGroup alignItems="flexEnd">
        <EuiFlexItem>
          <EuiForm isInvalid={patternError || titleError}>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.indexPatternLabel"
                  defaultMessage="Index pattern title"
                />
              }
              isInvalid={titleError}
              error={titleErrorMessage}
              helpText={
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.indexPattern.descriptiveTitle"
                  defaultMessage="A descriptive title for the index pattern"
                />
              }
            >
              <EuiFieldText
                name="indexPatternTitle"
                placeholder={i18n.translate(
                  'indexPatternManagement.createIndexPattern.step.indexPatternTitle',
                  {
                    defaultMessage: 'My Index Pattern',
                  }
                )}
                value={title}
                isInvalid={titleError}
                onChange={onTitleChanged}
                data-test-subj="createIndexPatternNameInput"
                fullWidth
              />
            </EuiFormRow>
            <EuiFormRow
              fullWidth
              label={
                <FormattedMessage
                  id="indexPatternManagement.createIndexPattern.step.indexPatternList"
                  defaultMessage="Index pattern list"
                />
              }
              isInvalid={patternError}
              error={patternErrorMessage}
              helpText={
                <>
                  <FormattedMessage
                    id="indexPatternManagement.createIndexPattern.step.indexPattern.instruction"
                    defaultMessage="Press enter after each pattern to add to the pattern list."
                  />{' '}
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
                isInvalid={isPatternInvalid}
                noSuggestions
                onChange={onChange}
                onCreateOption={onCreateOption}
                onSearchChange={onSearchChange}
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
              isDisabled={isNextDisabled}
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
