/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
} from '@elastic/eui';
import type { HttpSetup, NotificationsSetup } from '@kbn/core/public';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { RunStepButton } from './step_actions/run_step/run_step_button';

export interface ElasticsearchStepActionsProps {
  actionsProvider: any; // We'll make this optional since we're transitioning to unified providers
  http: HttpSetup;
  notifications: NotificationsSetup;
  esHost?: string;
  kibanaHost?: string;
  onStepActionClicked?: (params: { stepId: string; actionType: string }) => void;
}

export const ElasticsearchStepActions: React.FC<ElasticsearchStepActionsProps> = ({
  actionsProvider,
  http,
  notifications,
  esHost,
  kibanaHost,
  onStepActionClicked,
}) => {
  const styles = useMemoCss(componentStyles);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // Use state to force re-renders when actions change
  const [, setRefreshTrigger] = useState(0);

  // Listen for action updates - force refresh every 100ms when actions might change
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const currentStep = actionsProvider?.getCurrentElasticsearchStep();
  const currentActions = actionsProvider?.getCurrentActions?.() || [];

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

  const items = [
    ...(currentActions?.map((action: any, index: number) => (
      <EuiContextMenuItem
        data-test-subj={`actionButton-${action.id}`}
        key={action.id || index}
        onClick={() => {
          action.handler();
          closePopover();
        }}
        icon={action.icon}
      >
        {action.label}
      </EuiContextMenuItem>
    )) || []),
  ];

  return (
    <EuiFlexGroup css={styles.buttonsGroup} gutterSize="xs" alignItems="center" responsive={false}>
      {currentStep && (
        <EuiFlexItem grow={false}>
          <RunStepButton
            onClick={() =>
              onStepActionClicked?.({
                stepId: currentStep.name as string,
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
  buttonsGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      padding: euiTheme.size.xs,
      borderRadius: euiTheme.border.radius.small,
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    }),
};
