/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import { EuiHorizontalRule, EuiSpacer, EuiStepsProps, EuiStepsHorizontalProps } from '@elastic/eui';
import React, { useState, useMemo, useCallback } from 'react';
import { useRuleFormState } from './use_rule_form_state';
import { RuleActions } from '../rule_actions';
import { RuleDefinition } from '../rule_definition';
import { RuleDetails } from '../rule_details';
import {
  RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
  RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
  RULE_FORM_PAGE_RULE_DETAILS_TITLE,
} from '../translations';
import { hasActionsError, hasActionsParamsErrors, hasParamsErrors } from '../validation';
import { RuleFormStepId } from '../constants';

interface UseRuleFormStepsOptions {
  /* Used to track steps that have been interacted with and should mark errors with 'danger' instead of 'incomplete' */
  touchedSteps: Record<RuleFormStepId, boolean>;
  /* Used to track the current step in horizontal steps, not used for vertical steps */
  currentStep?: RuleFormStepId;
}

/**
 * Define the order of the steps programmatically. Updating this array will update the order of the steps
 * in all places needed.
 */
const STEP_ORDER = [RuleFormStepId.DEFINITION, RuleFormStepId.ACTIONS, RuleFormStepId.DETAILS];

const isStepBefore = (step: RuleFormStepId, comparisonStep: RuleFormStepId) => {
  return STEP_ORDER.indexOf(step) < STEP_ORDER.indexOf(comparisonStep);
};

// Create a common hook for both horizontal and vertical steps
const useCommonRuleFormSteps = ({ touchedSteps, currentStep }: UseRuleFormStepsOptions) => {
  const {
    plugins: { application },
    baseErrors = {},
    paramsErrors = {},
    actionsErrors = {},
    actionsParamsErrors = {},
  } = useRuleFormState();

  const canReadConnectors = !!application.capabilities.actions?.show;

  const hasRuleDefinitionErrors = useMemo(() => {
    return !!(
      hasParamsErrors(paramsErrors) ||
      baseErrors.interval?.length ||
      baseErrors.alertDelay?.length
    );
  }, [paramsErrors, baseErrors]);

  const hasActionErrors = useMemo(() => {
    return hasActionsError(actionsErrors) || hasActionsParamsErrors(actionsParamsErrors);
  }, [actionsErrors, actionsParamsErrors]);

  const hasRuleDetailsError = useMemo(() => {
    return baseErrors.name?.length || baseErrors.tags?.length;
  }, [baseErrors]);

  const ruleDefinitionStatus = useMemo(() => {
    // Only apply the current status if currentStep is being tracked
    if (currentStep === RuleFormStepId.DEFINITION) return 'current';

    if (hasRuleDefinitionErrors) {
      // Only apply the danger status if the user has interacted with this step and then focused on something else
      // Otherwise just mark it as incomplete
      return touchedSteps[RuleFormStepId.DEFINITION] ? 'danger' : 'incomplete';
    }
    // Only mark this step complete or incomplete if the currentStep flag is being used, otherwise set no status
    if (currentStep && isStepBefore(RuleFormStepId.DEFINITION, currentStep)) {
      return 'complete';
    } else if (currentStep) {
      return 'incomplete';
    }

    return undefined;
  }, [hasRuleDefinitionErrors, currentStep, touchedSteps]);

  const actionsStatus = useMemo(() => {
    if (currentStep === RuleFormStepId.ACTIONS) return 'current';

    if (hasActionErrors) {
      return touchedSteps[RuleFormStepId.ACTIONS] ? 'danger' : 'incomplete';
    }
    if (currentStep && isStepBefore(RuleFormStepId.ACTIONS, currentStep)) {
      return 'complete';
    } else if (currentStep) {
      return 'incomplete';
    }

    return undefined;
  }, [hasActionErrors, currentStep, touchedSteps]);

  const ruleDetailsStatus = useMemo(() => {
    if (currentStep === RuleFormStepId.DETAILS) return 'current';

    if (hasRuleDetailsError) {
      return touchedSteps[RuleFormStepId.DETAILS] ? 'danger' : 'incomplete';
    }
    if (currentStep && isStepBefore(RuleFormStepId.DETAILS, currentStep)) {
      return 'complete';
    } else if (currentStep) {
      return 'incomplete';
    }

    return undefined;
  }, [hasRuleDetailsError, currentStep, touchedSteps]);

  const steps = useMemo(
    () => ({
      [RuleFormStepId.DEFINITION]: {
        title: RULE_FORM_PAGE_RULE_DEFINITION_TITLE,
        status: ruleDefinitionStatus,
        children: <RuleDefinition />,
      },
      [RuleFormStepId.ACTIONS]: canReadConnectors
        ? {
            title: RULE_FORM_PAGE_RULE_ACTIONS_TITLE,
            status: actionsStatus,
            children: (
              <>
                <RuleActions />
                <EuiSpacer />
                <EuiHorizontalRule margin="none" />
              </>
            ),
          }
        : null,
      [RuleFormStepId.DETAILS]: {
        title: RULE_FORM_PAGE_RULE_DETAILS_TITLE,
        status: ruleDetailsStatus,
        children: (
          <>
            <RuleDetails />
            <EuiSpacer />
            <EuiHorizontalRule margin="none" />
          </>
        ),
      },
    }),
    [ruleDefinitionStatus, canReadConnectors, actionsStatus, ruleDetailsStatus]
  );

  const stepOrder: RuleFormStepId[] = useMemo(
    () => STEP_ORDER.filter((stepId) => steps[stepId]),
    [steps]
  );

  return { steps, stepOrder };
};

interface RuleFormVerticalSteps {
  steps: EuiStepsProps['steps'];
}

export const useRuleFormSteps: () => RuleFormVerticalSteps = () => {
  // Track steps that the user has interacted with and then focused away from
  const [touchedSteps, setTouchedSteps] = useState<Record<RuleFormStepId, boolean>>(
    STEP_ORDER.reduce(
      (result, stepId) => ({ ...result, [stepId]: false }),
      {} as Record<RuleFormStepId, boolean>
    )
  );

  const reportOnBlur = useCallback(
    (stepId: RuleFormStepId, element: React.JSX.Element) => (
      <div
        data-test-subj={`ruleFormStep-${stepId}-reportOnBlur`}
        onBlur={() =>
          !touchedSteps[stepId] &&
          setTouchedSteps({
            ...touchedSteps,
            [stepId]: true,
          })
        }
      >
        {element}
      </div>
    ),
    [touchedSteps]
  );

  const { steps, stepOrder } = useCommonRuleFormSteps({ touchedSteps });

  const mappedSteps = useMemo(() => {
    return stepOrder
      .map((stepId) => {
        const step = steps[stepId];
        return step
          ? {
              ...step,
              children: reportOnBlur(stepId, step.children),
            }
          : null;
      })
      .filter(Boolean) as EuiStepsProps['steps'];
  }, [steps, stepOrder, reportOnBlur]);

  return { steps: mappedSteps };
};

interface RuleFormHorizontalSteps {
  steps: EuiStepsHorizontalProps['steps'];
  currentStepComponent: React.ReactNode;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  hasNextStep: boolean;
  hasPreviousStep: boolean;
}
export const useRuleFormHorizontalSteps: () => RuleFormHorizontalSteps = () => {
  const [currentStep, setCurrentStep] = useState<RuleFormStepId>(STEP_ORDER[0]);
  const [touchedSteps, setTouchedSteps] = useState<Record<RuleFormStepId, boolean>>(
    STEP_ORDER.reduce(
      (result, stepId) => ({ ...result, [stepId]: false }),
      {} as Record<RuleFormStepId, boolean>
    )
  );

  const { steps, stepOrder } = useCommonRuleFormSteps({
    touchedSteps,
    currentStep,
  });

  const hasNextStep = useMemo(() => {
    if (currentStep) {
      const currentIndex = stepOrder.indexOf(currentStep);
      return currentIndex < stepOrder.length - 1;
    }
    return false;
  }, [stepOrder, currentStep]);
  const hasPreviousStep = useMemo(() => {
    if (currentStep) {
      const currentIndex = stepOrder.indexOf(currentStep);
      return currentIndex > 0;
    }
    return false;
  }, [stepOrder, currentStep]);
  const goToNextStep = useCallback(() => {
    if (currentStep && hasNextStep) {
      const currentIndex = stepOrder.indexOf(currentStep);
      const nextStep = stepOrder[currentIndex + 1];

      setTouchedSteps({
        ...touchedSteps,
        [currentStep]: true,
      });
      setCurrentStep(nextStep);
    }
  }, [currentStep, stepOrder, touchedSteps, hasNextStep]);
  const goToPreviousStep = useCallback(() => {
    if (currentStep && hasPreviousStep) {
      const currentIndex = stepOrder.indexOf(currentStep);
      const previousStep = stepOrder[currentIndex - 1];
      setCurrentStep(previousStep);
    }
  }, [currentStep, stepOrder, hasPreviousStep]);
  const jumpToStep = useCallback(
    (stepId: RuleFormStepId) => () => {
      setTouchedSteps({
        ...touchedSteps,
        [currentStep]: true,
      });
      setCurrentStep(stepId);
    },
    [currentStep, touchedSteps]
  );

  const mappedSteps = useMemo(() => {
    return stepOrder
      .map((stepId) => {
        const step = steps[stepId];
        return step
          ? {
              ...omit(step, 'children'),
              onClick: jumpToStep(stepId),
            }
          : null;
      })
      .filter(Boolean) as EuiStepsHorizontalProps['steps'];
  }, [steps, stepOrder, jumpToStep]);

  return {
    steps: mappedSteps,
    currentStepComponent: steps[currentStep]?.children,
    goToNextStep,
    goToPreviousStep,
    hasNextStep,
    hasPreviousStep,
  };
};
