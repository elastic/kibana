
let { join } = require('path');
let { promisify } = require('bluebird');
let read = promisify(require('fs').readFile);
let write = promisify(require('fs').writeFile);
let unlink = promisify(require('fs').unlink);
let stat = promisify(require('fs').stat);

module.exports = class UiBundle {
  constructor(opts) {
    opts = opts || {};

    this.env = opts.env;
    this.id = opts.id;
    this.plugins = opts.plugins;
    this.modules = opts.modules;
    this.template = opts.template;

    let pathBase = join(this.env.workingDir, this.id);
    this.entryPath = `${pathBase}.entry.js`;
    this.outputPath = `${pathBase}.bundle.js`;
  }

  renderContent() {
    return this.template({
      env: this.env,
      bundle: this
    });
  }

  async readEntryFile() {
    try {
      let content = await read(this.entryPath);
      return content.toString('utf8');
    }
    catch (e) {
      return null;
    }
  }

  async writeEntryFile() {
    return await write(this.entryPath, this.renderContent(), { encoding: 'utf8' });
  }

  async clearBundleFile() {
    try { await unlink(this.outputPath); }
    catch (e) { return null; }
  }

  async checkForExistingOutput() {
    try {
      await stat(this.outputPath);
      return true;
    }
    catch (e) {
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      plugins: this.plugins,
      modules: this.modules,
      entryPath: this.entryPath,
      outputPath: this.outputPath
    };
  }
};
