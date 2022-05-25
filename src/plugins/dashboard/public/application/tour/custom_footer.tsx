/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiI18n,
} from '@elastic/eui';
import React from 'react';
import { DashboardTourContextProps } from './dashboard_edit_tour_context';
interface CustomFooterProps {
  isLastStep: boolean;
  onNextTourStep: DashboardTourContextProps['onNextTourStep'];
  onFinishTour: DashboardTourContextProps['onFinishTour'];
}

export const CustomFooter = ({ isLastStep, onNextTourStep, onFinishTour }: CustomFooterProps) => {
  const actionButtonProps: Partial<EuiButtonProps> = {
    size: 's',
    color: 'success',
  };

  return (
    <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
      {!isLastStep && (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            color="text"
            size="xs"
            onClick={onFinishTour}
            data-test-subj="discoverTourButtonSkip"
          >
            {EuiI18n({ token: 'core.euiTourStep.skipTour', default: 'Skip tour' })}
          </EuiButtonEmpty>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        {isLastStep ? (
          <EuiButton
            {...actionButtonProps}
            onClick={onFinishTour}
            data-test-subj="discoverTourButtonEnd"
          >
            {EuiI18n({ token: 'core.euiTourStep.endTour', default: 'End tour' })}
          </EuiButton>
        ) : (
          <EuiButton
            {...actionButtonProps}
            onClick={onNextTourStep}
            data-test-subj="discoverTourButtonNext"
          >
            {EuiI18n({ token: 'core.euiTourStep.nextStep', default: 'Next' })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
