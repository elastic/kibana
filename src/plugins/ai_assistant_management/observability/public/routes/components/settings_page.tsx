/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTab, EuiTabs, EuiTitle } from '@elastic/eui';
import { useAppContext } from '../../hooks/use_app_context';
import { SettingsTab } from './settings_tab';
import { KnowledgeBaseTab } from './knowledge_base_tab';
import { useObservabilityAIAssistantManagementRouterParams } from '../../hooks/use_observability_management_params';
import { useObservabilityAIAssistantManagementRouter } from '../../hooks/use_observability_management_router';
import type { TabsRt } from '../config';
export function SettingsPage() {
  const {
    application: { navigateToApp },
    serverless,
    setBreadcrumbs,
  } = useAppContext();

  const router = useObservabilityAIAssistantManagementRouter();

  const {
    query: { tab },
  } = useObservabilityAIAssistantManagementRouterParams('/');

  useEffect(() => {
    if (serverless) {
      serverless.setBreadcrumbs([
        {
          text: i18n.translate(
            'aiAssistantManagementObservability.breadcrumb.serverless.observability',
            {
              defaultMessage: 'AI Assistant for Observability Settings',
            }
          ),
        },
      ]);
    } else {
      setBreadcrumbs([
        {
          text: i18n.translate('aiAssistantManagementObservability.breadcrumb.index', {
            defaultMessage: 'AI Assistants',
          }),
          onClick: (e) => {
            e.preventDefault();
            navigateToApp('management', { path: '/kibana/aiAssistantManagementSelection' });
          },
        },
        {
          text: i18n.translate('aiAssistantManagementObservability.breadcrumb.observability', {
            defaultMessage: 'Observability',
          }),
        },
      ]);
    }
  }, [navigateToApp, serverless, setBreadcrumbs]);

  const tabs: Array<{ id: TabsRt; name: string; content: JSX.Element }> = [
    {
      id: 'settings',
      name: i18n.translate('aiAssistantManagementObservability.settingsPage.settingsLabel', {
        defaultMessage: 'Settings',
      }),
      content: <SettingsTab />,
    },
    {
      id: 'knowledge_base',
      name: i18n.translate('aiAssistantManagementObservability.settingsPage.knowledgeBaseLabel', {
        defaultMessage: 'Knowledge base',
      }),
      content: <KnowledgeBaseTab />,
    },
  ];

  const [selectedTabId, setSelectedTabId] = useState<TabsRt>(
    tab ? tabs.find((t) => t.id === tab)?.id : tabs[0].id
  );

  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: TabsRt) => {
    setSelectedTabId(id);
    router.push('/', { path: '/', query: { tab: id } });
  };

  return (
    <>
      <EuiTitle size="l">
        <h2>
          {i18n.translate('aiAssistantManagementObservability.settingsPage.h2.settingsLabel', {
            defaultMessage: 'Settings',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiTabs data-test-subj="settingsPageTabs">
        {tabs.map((t, index) => (
          <EuiTab
            key={index}
            data-test-subj={`settingsPageTab-${t.id}`}
            onClick={() => onSelectedTabChanged(t.id)}
            isSelected={t.id === selectedTabId}
          >
            {t.name}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="l" />

      {selectedTabContent}

      <EuiSpacer size="l" />
    </>
  );
}
