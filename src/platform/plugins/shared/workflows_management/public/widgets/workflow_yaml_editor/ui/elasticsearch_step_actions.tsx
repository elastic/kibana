/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { monaco } from '@kbn/monaco';
import { RunStepButton } from './run_step_button';
import { useEditorState } from '../lib/state/state';
import type { StepInfo } from '../lib/state/build_workflow_lookup';
import { CopyElasticSearchDevToolsOption, CopyWorkflowStepOption } from './step_action_options';

export interface ElasticsearchStepActionsProps {
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const ElasticsearchStepActions: React.FC<ElasticsearchStepActionsProps> = ({
  onStepActionClicked,
}) => {
  const styles = useMemoCss(componentStyles);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // Use state to force re-renders when actions change
  const [positionStyles, setPositionStyles] = useState<{ top: string; right: string } | null>(null);
  const { focusedStepInfo, editor } = useEditorState();
  const focusedStepRef = useRef(focusedStepInfo);
  focusedStepRef.current = focusedStepInfo;

  const updateContainerPosition = (
    stepInfo: StepInfo | null,
    _editor: monaco.editor.IStandaloneCodeEditor | null
  ) => {
    if (!_editor || !stepInfo) {
      return;
    }

    setPositionStyles({
      top: `${_editor.getTopForLineNumber(stepInfo.lineStart, true) - _editor.getScrollTop()}px`,
      right: '0px',
    });
  };

  useEffect(() => {
    if (!focusedStepInfo) {
      return;
    }
    updateContainerPosition(focusedStepInfo, editor);
  }, [editor, focusedStepInfo, setPositionStyles]);

  useEffect(() => {
    if (!editor || !focusedStepRef.current) {
      return;
    }

    editor.onDidScrollChange(() => updateContainerPosition(focusedStepRef.current, editor));
  }, [focusedStepInfo, editor, setPositionStyles]);

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
      id="shit"
      css={styles.container}
      style={positionStyles ? positionStyles : {}}
      gutterSize="xs"
      alignItems="center"
      responsive={false}
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
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      zIndex: 1002, // Above the highlighting and pseudo-element
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      padding: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.small,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    }),
};
