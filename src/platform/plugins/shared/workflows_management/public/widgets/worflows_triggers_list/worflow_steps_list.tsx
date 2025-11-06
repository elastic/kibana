/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import capitalize from 'lodash/capitalize';
import React from 'react';
import type { Step } from '@kbn/workflows';
import { PopoverItems } from './popover_items';
import * as i18n from '../../../common/translations';
import { StepIcon } from '../../shared/ui/step_icons/step_icon';

interface WorkflowStepsListProps {
  steps: Step[];
  showLabel?: boolean;
}

export const WorkflowStepsList = ({ steps, showLabel = false }: WorkflowStepsListProps) => {
  if (steps.length === 0) {
    return (
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="crossInCircle" size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {'No steps'}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const renderItem = (step: Step, idx: number) => {
    const namespace = step.type.split('.')[0];
    return (
      <EuiFlexGroup
        key={`${step.type}-${idx}`}
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={{ flexGrow: 0 }}
      >
        <EuiFlexItem grow={false}>
          <StepIcon stepType={namespace} executionStatus={undefined} />
        </EuiFlexItem>
        {showLabel && (
          <EuiFlexItem grow={false}>
            <EuiText size="s">{capitalize(step.type)}</EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  const firstThree = steps.slice(0, 3);
  const restOfSteps = steps.slice(3);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
      {firstThree.map(renderItem)}
      {restOfSteps.length > 0 && (
        <EuiFlexItem grow={false}>
          <PopoverItems
            items={steps}
            popoverTitle={i18n.STEPS_LIST_TITLE}
            popoverButtonTitle={`+${restOfSteps.length.toString()}`}
            dataTestPrefix="triggers"
            renderItem={renderItem}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
