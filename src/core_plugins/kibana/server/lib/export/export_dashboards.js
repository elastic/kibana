import _ from 'lodash';
import collectDashboards from './collect_dashboards';
export default function exportDashboards(req) {
  const ids = _.flatten([req.payload || req.query.dashboard]);
  return collectDashboards(req, ids);
}
