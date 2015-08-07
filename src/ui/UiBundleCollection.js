let { pull, transform, pluck } = require('lodash');
let { join } = require('path');
let { resolve, promisify } = require('bluebird');
let rimraf = promisify(require('rimraf'));
let mkdirp = promisify(require('mkdirp'));
let unlink = promisify(require('fs').unlink);
let readdir = promisify(require('fs').readdir);
let readSync = require('fs').readFileSync;

let UiBundle = require('./UiBundle');
let appEntryTemplate = require('./appEntryTemplate');

class UiBundleCollection {
  constructor(bundlerEnv) {
    this.each = [];
    this.env = bundlerEnv;
  }

  addApp(app) {
    this.each.push(new UiBundle({
      id: app.id,
      modules: app.getModules(),
      template: appEntryTemplate,
      env: this.env
    }));
  }

  async ensureDir() {
    await mkdirp(this.env.workingDir);
  }

  async writeEntryFiles() {
    await this.ensureDir();

    for (let bundle of this.each) {
      let existing = await bundle.readEntryFile();
      let expected = bundle.renderContent();

      if (existing !== expected) {
        await bundle.writeEntryFile();
        await bundle.clearBundleFile();
      }
    }
  }

  async filterCachedBundles() {
    for (let bundle of this.each.slice()) {
      let exists = await bundle.checkForExistingOutput();
      if (exists) pull(this.each, bundle);
    }
  }

  toWebpackEntries() {
    return transform(this.each, function (entries, bundle) {
      entries[bundle.id] = bundle.entryPath;
    }, {});
  }

  getIds() {
    return pluck(this.each, 'id');
  }

  toJSON() {
    return this.each;
  }
}

module.exports = UiBundleCollection;
