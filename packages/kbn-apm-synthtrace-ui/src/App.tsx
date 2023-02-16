import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTab, EuiTabs } from '@elastic/eui';
import { Header } from './components/header';
import { NewScenarioForm } from './components/new_scenario_form';
import { Template } from './components/template';
import { ScenarioContextProvider } from './context/scenario_context';
import { ScenarioViewWaterfall } from './components/scenario_view_waterfall';
import Modal from './components/modal';
import { useState } from 'react';
import { Settings } from './components/settings';
import { useMemo } from 'react';

type TabId = 'settings' | 'synthtrace';

const TabsMap = {
  settings: <Settings />,
  synthtrace: (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <NewScenarioForm />
      </EuiFlexItem>
      <EuiFlexItem>
        <ScenarioViewWaterfall />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
};

function App() {
  const [selectedTabId, setSelectedTabId] = useState<TabId>('synthtrace');

  const TabContent = useMemo(() => TabsMap[selectedTabId], [selectedTabId]);
  return (
    <>
      <Header />
      <Template>
        <ScenarioContextProvider>
          <EuiTabs>
            <EuiTab
              key="synthtrace"
              onClick={() => {
                setSelectedTabId('synthtrace');
              }}
              isSelected={selectedTabId === 'synthtrace'}
            >
              Scenario
            </EuiTab>
            <EuiTab
              key="settings"
              onClick={() => {
                setSelectedTabId('settings');
              }}
              isSelected={selectedTabId === 'settings'}
            >
              Settings
            </EuiTab>
          </EuiTabs>
          {TabContent}
          <Modal />
        </ScenarioContextProvider>
      </Template>
    </>
  );
}

export default App;
