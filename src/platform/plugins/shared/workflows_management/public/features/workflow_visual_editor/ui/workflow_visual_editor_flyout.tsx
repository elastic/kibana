/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import {
  WorkflowVisualEditorFlyout as SharedWorkflowVisualEditorFlyout,
  type WorkflowVisualEditorFlyoutTarget,
} from '@kbn/workflows-ui';
import { setCursorPosition } from '../../../entities/workflows/store/workflow_detail/slice';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import {
  CopyDevToolsOption,
  CopyWorkflowStepJsonOption,
  CopyWorkflowStepOption,
} from '../../../widgets/workflow_yaml_editor/ui/step_action_options';

export type FlyoutTarget = WorkflowVisualEditorFlyoutTarget;

interface Props {
  readonly target: FlyoutTarget;
  readonly editorYaml: string;
  readonly canExecuteWorkflow: boolean;
  readonly isYamlValid: boolean;
  readonly onClose: () => void;
  readonly onOpenInYaml: () => void;
  readonly onRunStep: () => void;
}

export function WorkflowVisualEditorFlyout({
  target,
  editorYaml,
  canExecuteWorkflow,
  isYamlValid,
  onClose,
  onOpenInYaml,
  onRunStep,
}: Props) {
  const dispatch = useDispatch();
  const handleMoreMenuOpen = useCallback(() => {
    // Update the global focused-step state so the menu options pick up
    // this step from Redux (they read selectEditorFocusedStepInfo).
    if (target.kind === 'step' && target.stepInfo?.lineStart != null) {
      dispatch(setCursorPosition({ lineNumber: target.stepInfo.lineStart, column: 1 }));
    }
  }, [dispatch, target]);
  const renderMoreMenuItems = useCallback(
    (closeMenu: () => void) => {
      const items: JSX.Element[] = [];
      if (target.kind === 'step') {
        const stepType = target.stepInfo?.stepType ?? '';
        if (stepType.startsWith('elasticsearch.') || stepType.startsWith('kibana.')) {
          items.push(<CopyDevToolsOption key="copy-as-console" onClick={closeMenu} />);
        }
        items.push(
          <CopyWorkflowStepOption key="copy-as-yaml" onClick={closeMenu} />,
          <CopyWorkflowStepJsonOption key="copy-as-json" onClick={closeMenu} />
        );
      }
      return items;
    },
    [target]
  );

  return (
    <SharedWorkflowVisualEditorFlyout
      target={target}
      editorYaml={editorYaml}
      canExecuteWorkflow={canExecuteWorkflow}
      isYamlValid={isYamlValid}
      onClose={onClose}
      onOpenInYaml={onOpenInYaml}
      onRunStep={onRunStep}
      renderMoreMenuItems={renderMoreMenuItems}
      onMoreMenuOpen={handleMoreMenuOpen}
      renderStepIcon={({ stepType }) => (
        <StepIcon stepType={stepType} executionStatus={undefined} size="m" />
      )}
    />
  );
}
