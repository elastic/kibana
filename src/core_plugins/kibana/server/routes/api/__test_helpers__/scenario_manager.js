import { format as formatUrl } from 'url';

import ScenarioManager from '../../../../../../../test/fixtures/scenario_manager';
import serverConfig from '../../../../../../../test/server_config';

export function setupScenarioManager(scenario) {
  const scenarioManager = new ScenarioManager(formatUrl(serverConfig.servers.elasticsearch));

  async function loadScenario() {
    await scenarioManager.load(scenario);
  }

  async function unloadScenario() {
    await scenarioManager.unload(scenario);
  }

  return {
    loadScenario,
    unloadScenario,
    scenarioManager
  };
}
