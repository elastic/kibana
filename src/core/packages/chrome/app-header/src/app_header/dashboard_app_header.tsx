/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { AiButton } from '@kbn/shared-ux-ai-components';
import {
  AppHeaderView as AppHeaderPresentation,
  type AppHeaderViewProps as AppHeaderPresentationProps,
} from '@kbn/ui-app-header';
import { useInlineAppHeader } from './hooks';
import { usePresentationProps, type AppHeaderProps } from './app_header';

/** Temporary Dashboard AI action. Remove when the canvas overlay replaces this header control. */
export interface DashboardAppHeaderAiAction {
  id: string;
  label: string;
  run: () => void | Promise<void>;
  disabled?: boolean;
  tooltip?: string;
  testId?: string;
}

export type DashboardAppHeaderProps = AppHeaderProps & {
  /** Temporary escape hatch. Other apps must keep using `AppHeader`. */
  aiAction?: DashboardAppHeaderAiAction;
};

const createPinnedMenuAction = (
  aiAction: DashboardAppHeaderAiAction
): NonNullable<AppHeaderPresentationProps['pinnedMenuAction']> => {
  const { id, label, run, disabled, tooltip, testId } = aiAction;
  const onClick = () => {
    void run();
  };

  const inlineButton = (
    <AiButton
      id={id}
      variant="empty"
      size="s"
      iconType="sparkles"
      disabled={disabled}
      data-test-subj={testId}
      onClick={onClick}
    >
      {label}
    </AiButton>
  );

  return {
    inline: tooltip ? <EuiToolTip content={tooltip}>{inlineButton}</EuiToolTip> : inlineButton,
    collapsed: (
      <AiButton
        id={id}
        iconOnly
        variant="empty"
        size="s"
        iconType="sparkles"
        aria-label={label}
        disabled={disabled}
        data-test-subj={testId}
        withToolTip
        toolTipContent={tooltip ?? label}
        onClick={onClick}
      />
    ),
  };
};

/** Temporary Dashboard-only wrapper. Remove with the canvas overlay. Do not copy for other apps. */
export const DashboardAppHeader = React.memo<DashboardAppHeaderProps>(({ aiAction, ...props }) => {
  useInlineAppHeader();
  const presentationProps = usePresentationProps(
    props,
    aiAction ? { pinnedMenuAction: createPinnedMenuAction(aiAction) } : undefined
  );
  return <AppHeaderPresentation {...presentationProps} title={props.title} />;
});

DashboardAppHeader.displayName = 'DashboardAppHeader';
