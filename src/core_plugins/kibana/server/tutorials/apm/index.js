import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';

const apmIntro = 'Collect in-depth performance metrics and errors from inside your applications.';

function isEnabled(config, key) {
  try {
    return config.get(key);
  } catch (err) {
    return false;
  }
}

export function apmSpecProvider(server) {
  const config = server.config();

  const artifacts = {
    dashboards: [
      {
        id: '8d3ed660-7828-11e7-8c47-65b845b5cfb3',
        linkLabel: 'APM dashboard',
        isOverview: true
      }
    ]
  };
  if (isEnabled(config, 'xpack.apm.ui.enabled')) {
    artifacts.application = {
      path: '/app/apm',
      label: 'Launch APM'
    };
  }

  return {
    id: 'apm',
    name: 'APM',
    category: TUTORIAL_CATEGORY.OTHER,
    shortDescription: apmIntro,
    longDescription: 'Application Performance Monitoring (APM) collects in-depth' +
      ' performance metrics and errors from inside your application.' +
      ' It allows you to monitor the performance of thousands of applications in real time.' +
      ' [Learn more]({config.docs.base_url}guide/en/apm/get-started/{config.docs.version}/index.html).',
    euiIconType: 'apmApp',
    artifacts: artifacts,
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    previewImagePath: '/plugins/kibana/home/tutorial_resources/apm/apm.png',
  };
}
