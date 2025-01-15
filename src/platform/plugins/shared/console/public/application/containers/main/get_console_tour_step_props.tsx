/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiTourStepProps,
  EuiTourActions,
  EuiTourState,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ConsoleTourStepProps } from '../../components';

export const getConsoleTourStepProps = (
  stateTourStepProps: EuiTourStepProps[],
  actions: EuiTourActions,
  tourState: EuiTourState
): ConsoleTourStepProps[] => {
  return stateTourStepProps.map((step: EuiTourStepProps) => {
    const nextTourStep = () => {
      if (tourState.currentTourStep < 5) {
        actions.incrementStep();
      }
    };

    return {
      step: step.step,
      stepsTotal: step.stepsTotal,
      isStepOpen: step.step === tourState.currentTourStep && tourState.isTourActive,
      title: step.title,
      content: step.content,
      anchorPosition: step.anchorPosition,
      dataTestSubj: step['data-test-subj'],
      maxWidth: step.maxWidth,
      css: step.css,
      onFinish: () => actions.finishTour(false),
      footerAction:
        step.step === step.stepsTotal ? (
          <EuiButton
            color="success"
            size="s"
            onClick={() => actions.finishTour()}
            data-test-subj="consoleCompleteTourButton"
          >
            {i18n.translate('console.tour.completeTourButton', {
              defaultMessage: 'Complete',
            })}
          </EuiButton>
        ) : (
          [
            <EuiButtonEmpty
              size="s"
              color="text"
              onClick={() => actions.finishTour()}
              data-test-subj="consoleSkipTourButton"
            >
              {i18n.translate('console.tour.skipTourButton', {
                defaultMessage: 'Skip tour',
              })}
            </EuiButtonEmpty>,
            <EuiButton
              color="success"
              size="s"
              onClick={nextTourStep}
              data-test-subj="consoleNextTourStepButton"
            >
              {i18n.translate('console.tour.nextStepButton', {
                defaultMessage: 'Next',
              })}
            </EuiButton>,
          ]
        ),
    } as ConsoleTourStepProps;
  });
};
