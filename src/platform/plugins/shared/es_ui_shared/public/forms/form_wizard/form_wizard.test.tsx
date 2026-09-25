/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, waitFor } from '@testing-library/react';

import { FormWizard } from './form_wizard';
import { FormWizardStep } from './form_wizard_step';
import { useContent } from '../multi_content';

interface WizardContent {
  step1: { foo: string };
  step2: { bar: string };
  step3: { baz: string };
}

const StepOne = () => {
  const { updateContent } = useContent<WizardContent, 'step1'>('step1');
  useEffect(() => {
    updateContent({
      isValid: true,
      validate: async () => true,
      getData: () => ({ foo: 'ok' }),
    });
  }, [updateContent]);
  return <div data-test-subj="step1Content">Step 1</div>;
};

const StepTwoInvalid = () => {
  const { updateContent } = useContent<WizardContent, 'step2'>('step2');
  useEffect(() => {
    updateContent({
      isValid: false,
      validate: async () => false,
      getData: () => ({ bar: '' }),
    });
  }, [updateContent]);
  return <div data-test-subj="step2Content">Step 2</div>;
};

const StepThree = () => {
  const { updateContent } = useContent<WizardContent, 'step3'>('step3');
  useEffect(() => {
    updateContent({
      isValid: true,
      validate: async () => true,
      getData: () => ({ baz: 'ok' }),
    });
  }, [updateContent]);
  return <div data-test-subj="step3Content">Step 3</div>;
};

const renderWizard = () => {
  return render(
    <EuiProvider>
      <FormWizard<WizardContent>
        apiError={null}
        isEditing={false}
        defaultValue={{
          step1: { foo: '' },
          step2: { bar: '' },
          step3: { baz: '' },
        }}
        onSave={jest.fn()}
      >
        <FormWizardStep id="step1" label="Step 1" isRequired>
          <StepOne />
        </FormWizardStep>
        <FormWizardStep id="step2" label="Step 2" isRequired>
          <StepTwoInvalid />
        </FormWizardStep>
        <FormWizardStep id="step3" label="Step 3">
          <StepThree />
        </FormWizardStep>
      </FormWizard>
    </EuiProvider>
  );
};

describe('FormWizard navigation when invalid', () => {
  it('allows navigating backwards but blocks navigating forward', async () => {
    const { getByTestId, queryByTestId } = renderWizard();

    // Step 1 initially.
    expect(getByTestId('step1Content')).toBeInTheDocument();

    // Next to Step 2 (Step 1 is valid).
    fireEvent.click(getByTestId('nextButton'));
    await waitFor(() => expect(getByTestId('step2Content')).toBeInTheDocument());

    // Step 2 is invalid: Next should be disabled.
    expect(getByTestId('nextButton')).toBeDisabled();

    // But Back should be enabled and should navigate to Step 1.
    expect(getByTestId('backButton')).not.toBeDisabled();
    fireEvent.click(getByTestId('backButton'));
    await waitFor(() => expect(getByTestId('step1Content')).toBeInTheDocument());

    // Sanity: we never advanced to step 3 from invalid step 2.
    expect(queryByTestId('step3Content')).toBeNull();
  });
});
