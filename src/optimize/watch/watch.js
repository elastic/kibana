import { isWorker } from 'cluster';

export default async kbnServer => {

  if (!isWorker) {
    throw new Error(`watch optimization is only available when using the "--dev" cli flag`);
  }

  /**
   * When running in watch mode two processes run in one of the following modes:
   *
   * optmzr: this process runs the WatchOptimizer and the WatchServer
   *   which serves the WatchOptimizer's output and blocks requests
   *   while the optimizer is running
   *
   * server: this process runs the entire kibana server and proxies
   *   all requests for /bundles/* to the optmzr process
   *
   * @param  {string} process.env.kbnWorkerType
   */
  switch (process.env.kbnWorkerType) {
    case 'optmzr':
      await kbnServer.mixin(require('./optmzr_role'));
      break;

    case 'server':
      await kbnServer.mixin(require('./proxy_role'));
      break;

    default:
      throw new Error(`unknown kbnWorkerType "${process.env.kbnWorkerType}"`);
  }

};
