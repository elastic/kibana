export default function importDashboards(req) {
  const { payload } = req;
  const config = req.server.config();
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin');


  if (payload.version !== config.get('pkg.version')) {
    throw new Error(`Version ${payload.version} does not match ${config.get('pkg.version')}.`);
  }

  const body = [];

  return callWithRequest(req, 'bulk', { body });

}
