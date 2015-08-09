let { contains } = require('lodash');
let { join } = require('path');
let { fromNode } = require('bluebird');
let Boom = require('boom');
let FsOptimizer = require('../FsOptimizer');

module.exports = class LazyOptimizer extends FsOptimizer {
  constructor(opts) {
    super(opts);
    this.sent = [];
    this.log = opts.log || (() => null);
    this.prebuild = opts.prebuild || false;
  }

  async init() {
    await this.bundles.writeEntryFiles();
    await this.initCompiler();
    if (this.prebuild) await this.start();
  }

  start() {
    this.log(['info', 'optimize'], `Lazy Optimization for ${this.bundles.desc()} starting`);

    let start = Date.now();
    let prom = this.current = (async () => {
      try {

        let stats = await fromNode(cb => this.compiler.run(cb));
        if (stats.hasErrors() || stats.hasWarnings()) {
          let err = new Error('optimization failure');
          err.stats = stats;
          throw err;
        }

        return stats;

      } catch (e) {
        if (e.stats && this.current === prom) {
          this.log(['warning', 'optimize'], e.stats.toString({ colors: true }));
        }
        // TODO: rebuild on errors
        throw e;
      }
    }())
    .then(() => {
      let seconds = ((Date.now() - start) / 1000).toFixed(2);
      this.log(['info', 'optimize'], `Lazy optimization of ${this.bundles.desc()} complete in ${seconds} seconds.`);
    });

    return prom;
  }

  /**
   * Read a file from the in-memory bundles, paths just like those
   * produces by the FsOptimizer are used to access files. The first time
   * a file is requested it is marked as "sent". If that same file is requested
   * a second time then we will rerun the compiler.
   *
   * !!!ONLY ONE BROWSER TAB SHOULD ACCESS THE IN-MEMORY OPTIMIZERS FILES AT A TIME!!!
   *
   * @param  {[type]} relativePath [description]
   * @return {[type]}              [description]
   */
  async getPath(relativePath) {
    let path = join(this.compiler.outputPath, relativePath);
    let resend = contains(this.sent, path);

    if (resend) {
      this.sent = [];
      this.current = null;
    }

    if (!this.current) this.start();
    await this.current;

    this.sent.push(path);
    return path;
  }

  bindToServer(server) {
    server.route({
      path: '/bundles/{asset*}',
      method: 'GET',
      handler: async (request, reply) => {
        try {
          let path = await this.getPath(request.params.asset);
          return reply.file(path);
        } catch (error) {
          console.log(error.stack);
          return reply(error);
        }
      }
    });
  }
};
