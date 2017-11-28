import { TUTORIAL_CATEGORY } from '../../../common/tutorials/tutorial_category';
import { ON_PREM_INSTRUCTIONS } from './on_prem';
import { ELASTIC_CLOUD_INSTRUCTIONS } from './elastic_cloud';
import { ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS } from './on_prem_elastic_cloud';

export function mysqlLogsSpecProvider() {
  return {
    id: 'mysqlLogs',
    name: 'MySQL logs',
    category: TUTORIAL_CATEGORY.LOGGING,
    shortDescription: 'Collect and parse error and slow logs created by MySQL.',
    longDescription: 'The mysql Filebeat module parses error and slow logs created by MySQL.' +
                     ' [Learn more]({config.docs.beats.filebeat}/filebeat-module-mysql.html)' +
                     ' about the mysql module.',
    //iconPath: '', TODO
    completionTimeMinutes: 10,
    //previewImagePath: '', TODO
    onPrem: ON_PREM_INSTRUCTIONS,
    elasticCloud: ELASTIC_CLOUD_INSTRUCTIONS,
    onPremElasticCloud: ON_PREM_ELASTIC_CLOUD_INSTRUCTIONS
  };
}
