import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';

const apmIntro = 'Collect in-depth performance metrics and errors from inside your applications.';

export function apmSpecProvider() {
  return {
    id: 'apm',
    name: 'APM',
    category: TUTORIAL_CATEGORY.OTHER,
    shortDescription: apmIntro,
    longDescription: 'Application Performance Monitoring (APM) collects in-depth' +
      ' performance metrics and errors from inside your application.' +
      ' It allows you to monitor the performance of thousands of applications in real time.' +
      ' [Learn more]({config.docs.base_url}guide/en/apm/get-started/{config.docs.version}/index.html).',
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
    previewImagePath: '/plugins/kibana/home/tutorial_resources/apm/apm_dashboard_transactions.jpg',
  };
}
