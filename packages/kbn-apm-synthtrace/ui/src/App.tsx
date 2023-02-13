import React from 'react';
import { Header } from './components/header';
import { NewScenarioForm } from './components/new_scenario_form';
import { ScenarioView } from './components/scenario_view';
import { Template } from './components/template';
import { ScenarioContextProvider } from './context/scenario_context';

function App() {
  return (
    <>
      <Header />
      <Template>
        <ScenarioContextProvider>
          <NewScenarioForm />
          <ScenarioView />
        </ScenarioContextProvider>
      </Template>
    </>
  );
}

export default App;
