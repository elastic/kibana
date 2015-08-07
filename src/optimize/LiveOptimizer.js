let { contains } = require('lodash');
let { join } = require('path');
let { fromNode } = require('bluebird');
let webpack = require('webpack');
let Boom = require('boom');
let MemoryFileSystem = require('memory-fs');
let BaseOptimizer = require('./BaseOptimizer');

module.exports = class LiveOptimizer extends BaseOptimizer {
  async init() {
    await this.bundles.writeEntryFiles();
    await this.initCompiler();
    this.outFs = this.compiler.outputFileSystem = new MemoryFileSystem();
  }

  async compile() {
    let stats = await fromNode(cb => this.compiler.run(cb));

    if (stats.hasErrors() || stats.hasWarnings()) {
      let err = new Error('optimization failure');
      err.stats = stats;
      throw err;
    }

    return stats;
  }

  async start() {
    let prom = null;

    try {
      prom = this.current = this.compile();
      return await prom;
    }
    catch (e) {
      if (e.stats && this.current === prom) {
        console.log(e.stats.toString({ colors: true }));
      }

      throw e;
    }
    finally {
      this.current = null;
    }
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
  async get(relativePath) {
    try {

      let fs = this.outFs;
      let path = join(this.compiler.outputPath, relativePath);
      let restart = contains(this.sent, path);

      if (!this.sent || restart) {
        this.sent = [];
        this.current = null;
      }

      await (this.current || this.start());
      let content = fs.readFileSync(path); // may throw "Path doesn't exist"
      this.sent.push(path);
      return content || '';
    }
    catch (error) {
      if (error && error.message.match(/Path doesn't exist/)) {
        error = Boom.notFound();
      }

      console.log(error.stack);
      throw error;
    }
  }

  bindToServer(server) {
    server.route({
      path: '/bundles/{path*}',
      method: 'GET',
      handler: async (request, reply) => {
        let path = request.params.path;
        let mimeType = server.mime.path(path).type;

        try {
          let content = await this.get(path);
          return reply(content).type(mimeType);
        } catch (error) {
          return reply(Boom.wrap(error, 500));
        }
      }
    });
  }
};
