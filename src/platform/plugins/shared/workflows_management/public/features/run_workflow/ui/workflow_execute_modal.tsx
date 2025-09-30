/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
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
  useEuiTheme,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import type { WorkflowYaml } from '@kbn/workflows';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import capitalize from 'lodash/capitalize';
import { MANUAL_TRIGGERS_DESCRIPTIONS } from '../../../../common/translations';
import { WorkflowExecuteEventForm } from './workflow_execute_event_form';
import { WorkflowExecuteManualForm } from './workflow_execute_manual_form';

type TriggerType = 'manual' | 'alert' | 'scheduled';

export function WorkflowExecuteModal({
  definition,
  onClose,
  onSubmit,
}: {
  definition: WorkflowYaml | null;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => void;
}) {
  const modalTitleId = useGeneratedHtmlId();
  const enabledTriggers =
    definition?.triggers.filter((t: any) => t.enabled).map((t: any) => t.type) || [];

  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(enabledTriggers[0]);

  const [executionInput, setExecutionInput] = useState<string>('');
  const [executionInputErrors, setExecutionInputErrors] = useState<string | null>(null);

  const { euiTheme } = useEuiTheme();

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
              <EuiButton
                color={selectedTrigger === trigger ? 'primary' : 'text'}
                onClick={() => handleChangeTrigger(trigger)}
                iconSide="right"
                contentProps={{
                  style: {
                    justifyContent: 'flex-start',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    padding: selectedTrigger === trigger ? '10px' : '9px',
                    textAlign: 'left',
                  },
                }}
                css={css`
                  width: 100%;
                  height: fit-content;
                  svg,
                  img {
                    margin-left: auto;
                  }
                `}
              >
                <EuiRadio
                  name={capitalize(trigger)}
                  label={capitalize(trigger)}
                  id={trigger}
                  checked={selectedTrigger === trigger}
                  onChange={() => {}}
                />
                <EuiText
                  size="s"
                  css={css`
                    text-wrap: auto;
                    margin-left: ${euiTheme.size.l};
                  `}
                >
                  {MANUAL_TRIGGERS_DESCRIPTIONS[trigger]}
                </EuiText>
              </EuiButton>
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
            definition={definition}
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
