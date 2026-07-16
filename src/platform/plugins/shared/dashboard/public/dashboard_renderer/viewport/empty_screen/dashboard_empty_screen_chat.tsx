/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  type UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { uiActionsService } from '../../../services/kibana_services';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  type OpenDashboardChatActionContext,
} from '../../../dashboard_empty_screen_chat_action';

const metricsPrompt = i18n.translate('dashboard.emptyScreen.metricsPromptButtonLabel', {
  defaultMessage: 'Create a dashboard for my metrics',
});

const logsPrompt = i18n.translate('dashboard.emptyScreen.logsPromptButtonLabel', {
  defaultMessage: 'Build a dashboard to monitor my logs',
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

const getActionContext = (initialMessage: string) => ({
  initialMessage,
  trigger: { id: OPEN_DASHBOARD_CHAT_ACTION_ID },
});

export const useOpenDashboardChatAction = (): {
  action?: Action<OpenDashboardChatActionContext>;
  loading: boolean;
} => {
  const [action, setAction] = useState<Action<OpenDashboardChatActionContext>>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let canceled = false;

    const loadAction = async () => {
      if (!uiActionsService.hasAction(OPEN_DASHBOARD_CHAT_ACTION_ID)) {
        setLoading(false);
        return;
      }

      try {
        const registeredAction = (await uiActionsService.getAction(
          OPEN_DASHBOARD_CHAT_ACTION_ID
        )) as Action<OpenDashboardChatActionContext>;
        const compatible = await registeredAction.isCompatible(getActionContext(metricsPrompt));

        if (!canceled && compatible) {
          setAction(registeredAction);
        }
      } catch {
        // An unavailable action should not prevent the empty dashboard screen from rendering.
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    loadAction();

    return () => {
      canceled = true;
    };
  }, []);

  return { action, loading };
};

export const DashboardEmptyScreenChat = ({
  action,
}: {
  action: Action<OpenDashboardChatActionContext>;
}) => (
  <EuiPanel hasBorder paddingSize="none" css={styles.panel}>
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="productAgent" size="m" css={styles.assistanceText} aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem css={styles.content}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s" textAlign="left" css={styles.assistanceText}>
              <strong>
                {i18n.translate('dashboard.emptyScreen.createWithChatTitle', {
                  defaultMessage: 'Create with Chat',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="xs" responsive={false}>
              {promptSuggestions.map(({ prompt, testSubject }) => (
                <EuiFlexItem grow={false} key={prompt}>
                  <EuiButton
                    size="s"
                    color="text"
                    minWidth={false}
                    contentProps={{ css: styles.promptButtonContent }}
                    css={styles.promptButton}
                    onClick={() => action.execute(getActionContext(prompt))}
                    data-test-subj={testSubject}
                  >
                    {prompt}
                  </EuiButton>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
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
    }),
  assistanceText: ({ euiTheme }: UseEuiTheme) =>
    css({
      color: euiTheme.colors.textAssistance,
    }),
  promptButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderRadius: euiTheme.size.m,
    }),
  promptButtonContent: ({ euiTheme }: UseEuiTheme) =>
    css({
      paddingInline: euiTheme.size.xxs,
    }),
  content: css({
    minWidth: 0,
  }),
};
