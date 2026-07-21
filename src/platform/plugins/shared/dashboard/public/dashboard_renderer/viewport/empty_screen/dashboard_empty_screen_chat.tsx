/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  euiBreakpoint,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { uiActionsService } from '../../../services/kibana_services';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  type OpenDashboardChatActionContext,
} from './dashboard_empty_screen_chat_action';

const metricsPrompt = i18n.translate('dashboard.emptyScreen.metricsPromptButtonLabel', {
  defaultMessage: 'Create a dashboard for my metrics',
});

const logsPrompt = i18n.translate('dashboard.emptyScreen.logsPromptButtonLabel', {
  defaultMessage: 'Monitor my logs',
});

const promptSuggestions = [
  {
    prompt: metricsPrompt,
    testSubject: 'dashboardCreateWithChatMetricsPrompt',
  },
  {
    prompt: logsPrompt,
    testSubject: 'dashboardCreateWithChatLogsPrompt',
  },
] as const;

export const openDashboardChat = async (initialMessage?: string) => {
  const action: Action<OpenDashboardChatActionContext> = await uiActionsService.getAction(
    OPEN_DASHBOARD_CHAT_ACTION_ID
  );

  await action.execute({
    ...(initialMessage !== undefined ? { initialMessage } : {}),
    trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
  });
};

export const DashboardEmptyScreenChat = () => (
  <EuiPanel hasBorder paddingSize="none" css={styles.panel}>
    <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="productAgent" size="m" css={styles.assistanceText} aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" textAlign="left" css={styles.assistanceText}>
              <strong>
                {i18n.translate('dashboard.emptyScreen.createWithChatTitle', {
                  defaultMessage: 'Create with chat',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={styles.content}>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
          css={styles.promptsRow}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {promptSuggestions.map(({ prompt, testSubject }) => (
                <EuiFlexItem grow={false} key={prompt}>
                  <EuiButton
                    size="s"
                    color="text"
                    minWidth={false}
                    contentProps={{ css: styles.promptButtonContent }}
                    css={styles.promptButton}
                    onClick={() => {
                      openDashboardChat(prompt);
                    }}
                    data-test-subj={testSubject}
                  >
                    {prompt}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              css={styles.openChatButton}
              size="s"
              color="text"
              flush="both"
              onClick={() => {
                openDashboardChat();
              }}
              data-test-subj="dashboardCreateWithChatOpenChat"
            >
              {i18n.translate('dashboard.emptyScreen.openChatButtonLabel', {
                defaultMessage: 'Open chat →',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);

const styles = {
  panel: ({ euiTheme }: UseEuiTheme) =>
    css({
      border: `${euiTheme.border.width.thin} solid ${euiTheme.colors.borderStrongAssistance}`,
      padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
      textAlign: 'left',
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
    }),
  openChatButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingLeft: euiTheme.size.s,
    }),
  assistanceText: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textAssistance,
    }),
  promptButton: css({
    borderRadius: '8px',
    maxWidth: '100%',
    whiteSpace: 'nowrap',
  }),
  promptButtonContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingInline: euiTheme.size.xxs,
    }),
  promptsRow: (euiThemeContext: UseEuiTheme) =>
    css({
      flexWrap: 'nowrap',
      [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
        flexWrap: 'wrap',
      },
    }),
  content: css({
    minWidth: 0,
    maxWidth: '100%',
  }),
};
