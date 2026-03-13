/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { RunStepButton } from './run_step_button';
import {
  CopyDevToolsOption,
  CopyWorkflowStepJsonOption,
  CopyWorkflowStepOption,
} from './step_action_options';
import {
  selectEditorFocusedStepInfo,
  selectIsExecutionsTab,
} from '../../../entities/workflows/store';

export interface StepActionsProps {
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const StepActions = React.memo<StepActionsProps>(({ onStepActionClicked }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const focusedStepInfo = useSelector(selectEditorFocusedStepInfo);
  const isExecutionsTab = useSelector(selectIsExecutionsTab);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const menuButton = useMemo(() => {
    return (
      <EuiButtonIcon
        onClick={togglePopover}
        data-test-subj="toggleConsoleMenu"
        aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
          defaultMessage: 'Request options',
        })}
        iconType="boxesVertical"
        iconSize="s"
      />
    );
  }, [togglePopover]);

  const items = useMemo(() => {
    if (!focusedStepInfo) {
      return [];
    }

    const showDevToolsOption =
      focusedStepInfo.stepType.startsWith('elasticsearch.') ||
      focusedStepInfo.stepType.startsWith('kibana.');

    return [
      ...(showDevToolsOption
        ? [<CopyDevToolsOption key="copy-as-console" onClick={closePopover} />]
        : []),
      <CopyWorkflowStepOption key="copy-workflow-step" onClick={closePopover} />,
      <CopyWorkflowStepJsonOption key="copy-step-as-json" onClick={closePopover} />,
    ];
  }, [focusedStepInfo, closePopover]);

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
      {focusedStepInfo && !isExecutionsTab && (
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
            button={menuButton}
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
});
StepActions.displayName = 'StepActions';

const componentStyles = {
  actionsRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.small,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
};
