/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiStepsHorizontal, EuiSpacer } from '@elastic/eui';

import {
  FormWizardProvider,
  FormWizardConsumer,
  Props as ProviderProps,
} from './form_wizard_context';
import { FormWizardNav, NavTexts } from './form_wizard_nav';

interface Props<T extends object, S extends string> extends ProviderProps<T> {
  isSaving?: boolean;
  apiError: JSX.Element | null;
  texts?: Partial<NavTexts>;
  rightContentNav?: JSX.Element | null | ((stepId: S) => JSX.Element | null);
}

export function FormWizard<T extends object = { [key: string]: any }, S extends string = any>({
  texts,
  defaultActiveStep,
  defaultValue,
  apiError,
  isEditing,
  isSaving,
  onSave,
  onChange,
  children,
  rightContentNav,
}: Props<T, S>) {
  return (
    <FormWizardProvider<T>
      defaultValue={defaultValue}
      isEditing={isEditing}
      onSave={onSave}
      onChange={onChange}
      defaultActiveStep={defaultActiveStep}
    >
      <FormWizardConsumer>
        {({
          activeStepIndex,
          lastStep,
          steps,
          isCurrentStepValid,
          navigateToStep,
          activeStepId,
        }) => {
          const stepsRequiredArray = Object.values(steps).map(
            (step) => Boolean(step.isRequired) && step.isComplete === false
          );

          const getIsStepDisabled = (stepIndex: number) => {
            // Disable all steps when the current step is invalid
            if (stepIndex !== activeStepIndex && isCurrentStepValid === false) {
              return true;
            }

            let isDisabled = false;

            if (stepIndex > activeStepIndex + 1) {
              /**
               * Rule explained:
               * - all the previous steps are always enabled (we can go back anytime)
               * - the next step is also always enabled (it acts as the "Next" button)
               * - for the rest, the step is disabled if any of the previous step (_greater_ than the current
               * active step), is marked as isRequired **AND** has not been completed.
               */
              isDisabled = stepsRequiredArray.reduce((acc, isRequired, i) => {
                if (acc === true || i <= activeStepIndex || i >= stepIndex) {
                  return acc;
                }
                return Boolean(isRequired);
              }, false);
            }

            return isDisabled;
          };

          const euiSteps = Object.values(steps).map(({ index, label }) => {
            return {
              title: label,
              isComplete: activeStepIndex > index,
              isSelected: activeStepIndex === index,
              disabled: getIsStepDisabled(index),
              onClick: () => navigateToStep(index),
            };
          });

          const getRightContentNav = () => {
            if (typeof rightContentNav === 'function') {
              return rightContentNav(activeStepId);
            }
            return rightContentNav;
          };

          const onBack = () => {
            const prevStep = activeStepIndex - 1;
            navigateToStep(prevStep);
          };

          const onNext = () => {
            const nextStep = activeStepIndex + 1;
            navigateToStep(nextStep);
          };

          return (
            <>
              {/* Horizontal Steps indicator */}
              <EuiStepsHorizontal steps={euiSteps} />

              <EuiSpacer size="l" />

              {/* Any possible API error when saving/updating */}
              {apiError}

              {/* Active step content */}
              {children}

              <EuiSpacer size="l" />

              {/* Button navigation */}
              <FormWizardNav
                activeStepIndex={activeStepIndex}
                lastStep={lastStep}
                isStepValid={isCurrentStepValid}
                isSaving={isSaving}
                onBack={onBack}
                onNext={onNext}
                texts={texts}
                getRightContent={getRightContentNav}
              />
            </>
          );
        }}
      </FormWizardConsumer>
    </FormWizardProvider>
  );
}
