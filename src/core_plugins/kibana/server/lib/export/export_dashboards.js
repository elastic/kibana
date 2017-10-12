import _ from 'lodash';
import { collectDashboards } from './collect_dashboards';


export async function exportDashboards(dashboards, config, savedObjectsService) {
  const ids = _.flatten([dashboards]);

  const objects = await collectDashboards(savedObjectsService, ids);
  return {
    version: config.get('pkg.version'),
    objects
  };

}
