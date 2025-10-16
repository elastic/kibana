/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import { css } from '@emotion/react';
import { RunStepButton } from './run_step_button';
import { selectFocusedStepInfo } from '../lib/store';
import { CopyElasticSearchDevToolsOption, CopyWorkflowStepOption } from './step_action_options';

export interface StepActionsProps {
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const StepActions: React.FC<StepActionsProps> = ({ onStepActionClicked }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const focusedStepInfo = useSelector(selectFocusedStepInfo);

  const closePopover = () => {
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiButtonIcon
      onClick={() => {
        setIsPopoverOpen((prev) => !prev);
      }}
      data-test-subj="toggleConsoleMenu"
      aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
        defaultMessage: 'Request options',
      })}
      iconType="boxesVertical"
      iconSize="s"
    />
  );

  const items = useMemo(() => {
    if (!focusedStepInfo) {
      return [];
    }

    return [
      ...[
        ...(focusedStepInfo.stepType.startsWith('elasticsearch.')
          ? [<CopyElasticSearchDevToolsOption key="copy-as-console" onClick={closePopover} />]
          : []),
        <CopyWorkflowStepOption key="copy-workflow-step" onClick={closePopover} />,
      ],
    ];
  }, [focusedStepInfo]);

  if (!focusedStepInfo) {
    return null;
  }

  return (
    <EuiFlexGroup
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      css={componentStyles.actionsRow}
    >
      {focusedStepInfo && (
        <EuiFlexItem grow={false}>
          <RunStepButton
            onClick={() =>
              onStepActionClicked?.({
                stepId: focusedStepInfo.stepId as string,
                actionType: 'run',
              })
            }
          />
        </EuiFlexItem>
      )}
      {!!items.length && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="contextMenu"
            button={button}
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel items={items} data-test-subj="consoleMenu" />
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const componentStyles = {
  actionsRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.small,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
};
