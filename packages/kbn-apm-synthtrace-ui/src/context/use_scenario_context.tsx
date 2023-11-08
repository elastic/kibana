import { useContext } from 'react';
import { ScenarioContext } from './scenario_context';

export function useScenarioContext() {
  const context = useContext(ScenarioContext);

  if (!context) {
    throw new Error('Missing ScenarioContext context provider');
  }

  return context;
}
