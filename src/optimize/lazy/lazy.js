module.exports = async (kbnServer, server, config) => {

  let { isWorker } = require('cluster');

  if (!isWorker) {
    throw new Error(`lazy optimization is only available in "watch" mode.`);
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
      await kbnServer.mixin(require('./optmzrRole'));
      break;

    case 'server':
      await kbnServer.mixin(require('./proxyRole'));
      break;

    default:
      throw new Error(`unkown kbnWorkerType "${process.env.kbnWorkerType}"`);
  }

};
