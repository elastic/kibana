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
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface Props {
  activeStepIndex: number;
  lastStep: number;
  onBack: () => void;
  onNext: () => void;
  isSaving?: boolean;
  isStepValid?: boolean;
  texts?: Partial<NavTexts>;
}

export interface NavTexts {
  back: string | JSX.Element;
  next: string | JSX.Element;
  save: string | JSX.Element;
  saving: string | JSX.Element;
}

const DEFAULT_TEXTS = {
  back: i18n.translate('esUi.formWizard.backButtonLabel', { defaultMessage: 'Back' }),
  next: i18n.translate('esUi.formWizard.nextButtonLabel', { defaultMessage: 'Next' }),
  save: i18n.translate('esUi.formWizard.saveButtonLabel', { defaultMessage: 'Save' }),
  saving: i18n.translate('esUi.formWizard.savingButtonLabel', { defaultMessage: 'Saving...' }),
};

export const FormWizardNav = ({
  activeStepIndex,
  lastStep,
  isStepValid,
  isSaving,
  onBack,
  onNext,
  texts,
}: Props) => {
  const isLastStep = activeStepIndex === lastStep;
  const labels = {
    ...DEFAULT_TEXTS,
    ...texts,
  };

  const nextButtonLabel = isLastStep
    ? Boolean(isSaving)
      ? labels.saving
      : labels.save
    : labels.next;

  return (
    <EuiFlexGroup justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          {/* Back button */}
          {activeStepIndex > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="arrowLeft"
                onClick={onBack}
                data-test-subj="backButton"
                disabled={isStepValid === false}
              >
                {labels.back}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}

          {/* Next button */}
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType={isLastStep ? 'check' : 'arrowRight'}
              onClick={onNext}
              iconSide={isLastStep ? 'left' : 'right'}
              disabled={isStepValid === false}
              data-test-subj="nextButton"
              isLoading={isSaving}
            >
              {nextButtonLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
