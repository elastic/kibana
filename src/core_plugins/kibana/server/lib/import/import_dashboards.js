import _ from 'lodash';

const acceptableTypes = [
  'search',
  'dashboard',
  'visualization',
  'index-pattern'
];

export default function importDashboards(req) {
  const { payload } = req;
  const config = req.server.config();
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');
  const index = config.get('kibana.index');


  if (payload.version !== config.get('pkg.version')) {
    return Promise.reject(new Error(`Version ${payload.version} does not match ${config.get('pkg.version')}.`));
  }

  const body = payload.objects.reduce((acc, item) => {
    if (_.includes(acceptableTypes, item._type)) {
      acc.push({ create: { _index: index, _type: item._type, _id: item._id } });
      acc.push(item._source);
    }
    return acc;
  }, []);

  return callWithRequest(req, 'bulk', { body });

}
