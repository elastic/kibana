import { isWorker } from 'cluster';
module.exports = async kbnServer => {


  if (!isWorker) {
    throw new Error(`lazy optimization is only available in "watch" mode`);
  }

  /**
   * When running in lazy mode two workers/threads run in one
   * of the modes: 'optmzr' or 'server'
   *
   * optmzr: this thread runs the LiveOptimizer and the LazyServer
   *   which serves the LiveOptimizer's output and blocks requests
   *   while the optimizer is running
   *
   * server: this thread runs the entire kibana server and proxies
   *   all requests for /bundles/* to the optmzr
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
