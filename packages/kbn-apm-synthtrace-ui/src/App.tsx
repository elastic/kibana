import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Header } from './components/header';
import { NewScenarioForm } from './components/new_scenario_form';
import { Template } from './components/template';
import { ScenarioContextProvider } from './context/scenario_context';
import { ScenarioViewWaterfall } from './components/scenario_view_waterfall';
import Modal from './components/modal';

function App() {
  return (
    <>
      <Header />
      <Template>
        <ScenarioContextProvider>
          <EuiFlexGroup direction="column">
            <EuiFlexItem>
              <NewScenarioForm />
            </EuiFlexItem>
            <EuiFlexItem>
              <ScenarioViewWaterfall />
            </EuiFlexItem>
          </EuiFlexGroup>
          <Modal />
        </ScenarioContextProvider>
      </Template>
    </>
  );
}

export default App;
