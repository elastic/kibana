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
        Step 1 of 2: Define index pattern
      </h2>
    </EuiTitle>
    <EuiSpacer size="m"/>
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
      <EuiFlexItem grow={false}>
        <EuiForm
          isInvalid={isInputInvalid}
        >
          <EuiFormRow
            label="Index pattern"
            isInvalid={isInputInvalid}
            error={errors}
            helpText={
              <div>
                <p>You can use a <strong>*</strong> as a wildcard in your index pattern.</p>
                <p>You can&apos;t use spaces or the characters <strong>{characterList}</strong>.</p>
              </div>
            }
          >
            <EuiFieldText
              name="indexPattern"
              placeholder="index-name-*"
              value={query}
              isInvalid={isInputInvalid}
              onChange={onQueryChanged}
              data-test-subj="createIndexPatternNameInput"
            />
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
          Next step
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);
