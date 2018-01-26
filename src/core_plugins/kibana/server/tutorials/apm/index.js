import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';

const apmIntro = 'APM (Application Performance Monitoring) automatically collects in-depth' +
  ' performance metrics and errors from inside your applications.';

export function apmSpecProvider() {
  return {
    id: 'apm',
    name: 'APM',
    category: TUTORIAL_CATEGORY.OTHER,
    shortDescription: apmIntro,
    longDescription: `${apmIntro} APM consists of three components - the Agents, the Server, and the UI:\n` +
      '* The Agents are libraries in your application that run inside of your application process.\n' +
      '* The Server processes data from agents and stores the application data in Elasticsearch.\n' +
      '* The UI is the dedicated APM UI (X-Pack Basic) and preconfigured dashboards.\n\n' +
      'For more information, [please see our documentation]' +
      '({config.docs.base_url}guide/en/apm/get-started/{config.docs.version}/index.html).' +
      ' To get started, follow the steps below.',
    artifacts: {
      dashboards: [
        {
          id: '8d3ed660-7828-11e7-8c47-65b845b5cfb3',
          linkLabel: 'APM Services dashboard',
          isOverview: true
        }
      ]
    },
    onPrem: ON_PREM_INSTRUCTIONS,
  };
}
