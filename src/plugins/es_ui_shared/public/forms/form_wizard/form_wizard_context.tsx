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

import React, { useState, createContext, useContext, useCallback } from 'react';

import { WithMultiContent, useMultiContentContext, HookProps } from '../multi_content';

export interface Props<T extends object> {
  onSave: (data: T) => void | Promise<void>;
  children: JSX.Element | Array<JSX.Element | null | false>;
  isEditing?: boolean;
  defaultActiveStep?: number;
  defaultValue?: HookProps<T>['defaultValue'];
  onChange?: HookProps<T>['onChange'];
}

interface State {
  activeStepIndex: number;
  steps: Steps;
}

export interface Step {
  id: string;
  index: number;
  label: string;
  isRequired: boolean;
  isComplete: boolean;
}

export interface Steps {
  [stepId: string]: Step;
}

export interface Context<Id extends string = any> extends State {
  activeStepId: Id;
  lastStep: number;
  isCurrentStepValid: boolean | undefined;
  navigateToStep: (stepId: number | Id) => void;
  addStep: (id: Id, label: string, isRequired?: boolean) => void;
}

const formWizardContext = createContext<Context>({} as Context);

export const FormWizardProvider = WithMultiContent<Props<any>>(function FormWizardProvider<
  T extends object = { [key: string]: any }
>({ children, defaultActiveStep = 0, isEditing, onSave }: Props<T>) {
  const { getData, validate, validation } = useMultiContentContext<T>();

  const [state, setState] = useState<State>({
    activeStepIndex: defaultActiveStep,
    steps: {},
  });

  const activeStepId = state.steps[state.activeStepIndex]?.id;
  const lastStep = Object.keys(state.steps).length - 1;
  const isCurrentStepValid = validation.contents[activeStepId as keyof T];

  const addStep = useCallback(
    (id: string, label: string, isRequired = false) => {
      setState((prev) => {
        const index = Object.keys(prev.steps).length;

        return {
          ...prev,
          steps: {
            ...prev.steps,
            [index]: { id, index, label, isRequired, isComplete: isEditing ?? false },
          },
        };
      });
    },
    [isEditing]
  );

  /**
   * Get the step index from a step id.
   */
  const getStepIndex = useCallback(
    (stepId: number | string) => {
      if (typeof stepId === 'number') {
        return stepId;
      }

      // We provided a string stepId, we need to find the corresponding index
      const targetStep: Step | undefined = Object.values(state.steps).find(
        (_step) => _step.id === stepId
      );
      if (!targetStep) {
        throw new Error(`Can't navigate to step "${stepId}" as there are no step with that ID.`);
      }
      return targetStep.index;
    },
    [state.steps]
  );

  const navigateToStep = useCallback(
    async (stepId: number | string) => {
      // Before navigating away we validate the active content in the DOM
      const isValid = await validate();

      // If step is not valid do not go any further
      if (!isValid) {
        return;
      }

      const nextStepIndex = getStepIndex(stepId);

      if (nextStepIndex > lastStep) {
        // We are on the last step, save the data and don't go any further
        onSave(getData() as T);
        return;
      }

      // Update the active step
      setState((prev) => {
        const currentStep = prev.steps[prev.activeStepIndex];

        const nextState = {
          ...prev,
          activeStepIndex: nextStepIndex,
        };

        if (nextStepIndex > prev.activeStepIndex && !currentStep.isComplete) {
          // Mark the current step as completed
          nextState.steps[prev.activeStepIndex] = {
            ...currentStep,
            isComplete: true,
          };
        }

        return nextState;
      });
    },
    [getStepIndex, validate, onSave, getData, lastStep]
  );

  const value: Context = {
    ...state,
    activeStepId,
    lastStep,
    isCurrentStepValid,
    addStep,
    navigateToStep,
  };

  return <formWizardContext.Provider value={value}>{children}</formWizardContext.Provider>;
});

export const FormWizardConsumer = formWizardContext.Consumer;

export function useFormWizardContext<T extends string = any>() {
  const ctx = useContext(formWizardContext);
  if (ctx === undefined) {
    throw new Error('useFormWizardContext() must be called within a <FormWizardProvider />');
  }
  return ctx as Context<T>;
}
