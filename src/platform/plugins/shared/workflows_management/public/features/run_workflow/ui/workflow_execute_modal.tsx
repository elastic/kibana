/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCard,
  EuiModal,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRadio,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { WorkflowDetailDto, WorkflowListItemDto } from '@kbn/workflows';
import { capitalize } from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { MANUAL_TRIGGERS_DESCRIPTIONS } from '../../../../common/translations';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';

type TriggerType = 'manual' | 'alert' | 'scheduled';

export function WorkflowExecuteModal({
  workflow,
  onClose,
  onSubmit,
}: {
  workflow: WorkflowDetailDto | WorkflowListItemDto;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
}) {
  const modalTitleId = useGeneratedHtmlId();
  const enabledTriggers =
    workflow?.definition.triggers.filter((t: any) => t.enabled).map((t: any) => t.type) || [];

  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(enabledTriggers[0]);

  const [executionInput, setExecutionInput] = useState<string>('');
  const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);

  const handleSubmit = () => {
    onSubmit(JSON.parse(executionInput));
    onClose();
  };

  const handleChangeTrigger = (trigger: TriggerType): void => {
    setExecutionInput('');
    setSelectedTrigger(trigger);
  };

  return (
    <EuiModal
      aria-labelledby={modalTitleId}
      onClose={onClose}
      maxWidth={1400}
      style={{ width: '1200px', height: '100vh' }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>Run Workflow</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFlexGroup direction="row" gutterSize="l">
          {enabledTriggers.map((trigger) => (
            <EuiFlexItem key={trigger}>
              <EuiCard
                title={
                  <EuiText size="s">
                    <strong>{capitalize(trigger)}</strong>
                  </EuiText>
                }
                icon={
                  <EuiRadio
                    onChange={() => handleChangeTrigger(trigger)}
                    name="selectedTrigger"
                    checked={selectedTrigger === trigger}
                  />
                }
                onClick={() => handleChangeTrigger(trigger)}
                display={selectedTrigger === trigger ? 'primary' : 'plain'}
                layout="horizontal"
                hasBorder
              >
                {MANUAL_TRIGGERS_DESCRIPTIONS[trigger]}
              </EuiCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>

        {selectedTrigger === 'alert' && (
          <WorkflowExecuteEventForm
            value={executionInput}
            setValue={setExecutionInput}
            errors={executionInputErrors}
            setErrors={setExecutionInputErrors}
          />
        )}
        {selectedTrigger === 'manual' && (
          <WorkflowExecuteManualForm
            workflow={workflow}
            value={executionInput}
            errors={executionInputErrors}
            setErrors={setExecutionInputErrors}
            setValue={setExecutionInput}
          />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton
          onClick={handleSubmit}
          iconType="play"
          disabled={Boolean(executionInputErrors)}
          color="success"
          data-test-subj="executeWorkflowButton"
        >
          <FormattedMessage id="keepWorkflows.buttonText" defaultMessage="Run" ignoreTag />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
