import HapiTemplates from 'vision';
import HapiStaticFiles from 'inert';
import HapiProxy from 'h2o2';
import { fromNode } from 'bluebird';

const plugins = [HapiTemplates, HapiStaticFiles, HapiProxy];

async function registerPlugins(server) {
  await fromNode(cb => {
    server.register(plugins, cb);
  });
}

export default function (kbnServer, server) {
  registerPlugins(server);
}
