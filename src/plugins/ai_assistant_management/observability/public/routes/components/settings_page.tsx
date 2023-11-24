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
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/app_context';
import { SettingsTab } from './settings_tab';
import { KnowledgeBaseTab } from './knowledge_base_tab';

export function SettingsPage() {
  const { navigateToApp, serverless, setBreadcrumbs } = useAppContext();

  const { search } = useLocation();
  const searchParams = new URLSearchParams(search);
  const selectedTab = searchParams.get('tab');

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
            navigateToApp('management', { path: '/kibana/aiAssistantManagement' });
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

  const tabs = [
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

  const [selectedTabId, setSelectedTabId] = useState(
    selectedTab ? tabs.find((tab) => tab.id === selectedTab)?.id : tabs[0].id
  );

  const selectedTabContent = tabs.find((obj) => obj.id === selectedTabId)?.content;

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
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

      <EuiTabs>
        {tabs.map((tab, index) => (
          <EuiTab
            key={index}
            onClick={() => onSelectedTabChanged(tab.id)}
            isSelected={tab.id === selectedTabId}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="l" />

      {selectedTabContent}

      <EuiSpacer size="l" />
    </>
  );
}
