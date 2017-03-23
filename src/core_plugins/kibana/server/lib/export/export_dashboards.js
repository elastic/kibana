import _ from 'lodash';
import collectDashboards from './collect_dashboards';
export default function exportDashboards(req) {
  const ids = _.flatten([req.payload || req.query.dashboard]);
  const config = req.server.config();
  return collectDashboards(req, ids).then(objects => {
    return {
      version: config.get('pkg.version'),
      objects
    };
  });
}
