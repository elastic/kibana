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
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { isMac } from '@kbn/shared-ux-utility';
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
  onStepRun?: (params: { stepId: string; actionType: string }) => void;
  onMoveStepUp?: () => void;
  onMoveStepDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const MODIFIER_KEY = isMac ? '⌘' : 'Ctrl';
const ALT_KEY = isMac ? '⌥' : 'Alt';

export const StepActions = React.memo<StepActionsProps>(
  ({ onStepRun, onMoveStepUp, onMoveStepDown, canMoveUp = false, canMoveDown = false }) => {
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
        <EuiToolTip
          content={i18n.translate('console.requestOptionsButtonAriaLabel', {
            defaultMessage: 'Request options',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            onClick={togglePopover}
            data-test-subj="toggleConsoleMenu"
            aria-label={i18n.translate('console.requestOptionsButtonAriaLabel', {
              defaultMessage: 'Request options',
            })}
            iconType="boxesVertical"
            iconSize="s"
          />
        </EuiToolTip>
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

    const moveUpLabel = i18n.translate('workflows.yamlEditor.stepActions.moveUp', {
      defaultMessage: 'Move step up',
    });
    const moveDownLabel = i18n.translate('workflows.yamlEditor.stepActions.moveDown', {
      defaultMessage: 'Move step down',
    });
    const moveUpTooltip = `${moveUpLabel} (${MODIFIER_KEY} ${ALT_KEY} Shift ↑)`;
    const moveDownTooltip = `${moveDownLabel} (${MODIFIER_KEY} ${ALT_KEY} Shift ↓)`;

    if (!focusedStepInfo) {
      return null;
    }

    const showMoveButtons = !isExecutionsTab && (onMoveStepUp || onMoveStepDown);

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
                onStepRun?.({
                  stepId: focusedStepInfo.stepId as string,
                  actionType: 'run',
                })
              }
            />
          </EuiFlexItem>
        )}
        {showMoveButtons && (
          <>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={moveUpTooltip} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="arrowUp"
                  iconSize="s"
                  onClick={onMoveStepUp}
                  disabled={!canMoveUp}
                  data-test-subj="workflowMoveStepUp"
                  aria-label={moveUpTooltip}
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={moveDownTooltip} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="arrowDown"
                  iconSize="s"
                  onClick={onMoveStepDown}
                  disabled={!canMoveDown}
                  data-test-subj="workflowMoveStepDown"
                  aria-label={moveDownTooltip}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </>
        )}
        {!!items.length && (
          <EuiFlexItem grow={false}>
            <EuiPopover
              id="contextMenu"
              aria-label={i18n.translate('workflows.stepActions.contextMenuAriaLabel', {
                defaultMessage: 'Step actions',
              })}
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
  }
);
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
