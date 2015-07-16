'use strict';

let _ = require('lodash');
let join = require('path').join;
let resolve = require('bluebird').resolve;
let promify = require('bluebird').promisify;
let rimraf = promify(require('rimraf'));
let mkdirp = promify(require('mkdirp'));

let stat = promify(require('fs').stat);
let read = promify(require('fs').readFile);
let write = promify(require('fs').writeFile);
let unlink = promify(require('fs').unlink);
let readdir = promify(require('fs').readdir);
let readSync = require('fs').readFileSync;

let appEntryTmpl = _.template(readSync(join(__dirname, 'OptmzAppEntry.js.tmpl')));
let serverVersion = require('../../utils/closestPackageJson').getSync().version;

class OptmzBundles {
  constructor(opts) {
    let dir = _.get(opts, 'bundleDir');
    let apps = _.get(opts, 'apps');
    let versionTag = _.get(opts, 'sourceMaps') ? ' (with source maps)' : '';

    this.dir = dir;
    if (!_.isString(this.dir)) {
      throw new TypeError('Optimizer requires a working directory');
    }

    this.entries = _.map(apps, function (app) {
      let entry = {
        id: app.id,
        app: app,
        modules: app.getModules(),
        deps: app.relatedPlugins(),
        path: join(dir, app.id + '.entry.js'),
        bundlePath: join(dir, app.id + '.js')
      };

      entry.content = appEntryTmpl(_.defaults({
        version: `${serverVersion}${versionTag}`
      }, entry));

      return entry;
    });

    _.bindAll(this, [
      'init',
      'cleanBundles',
      'ensureBundleDir',
      'syncBundleDir',
      'syncBundle',
      'clean',
      'dirContents',
      'getUnkownBundleFiles',
      'getEntriesToCompile'
    ]);
  }

  init(fresh) {
    return resolve()
    .then(fresh ? this.cleanBundles : _.noop)
    .then(this.ensureBundleDir)
    .then(this.syncBundleDir);
  }

  cleanBundles() {
    return rimraf(this.dir);
  }

  ensureBundleDir() {
    return mkdirp(this.dir);
  }

  syncBundleDir() {
    let ensure = this.entries.map(this.syncBundle);
    let collectGarbage = this.getUnkownBundleFiles().then(this.clean);
    return resolve(ensure.concat(collectGarbage)).all().then(_.noop);
  }

  syncBundle(entry) {
    let clean = this.clean;

    return resolve([
      read(entry.path),
      stat(entry.bundlePath)
    ])
    .settle()
    .spread(function (readEntry, statBundle) {
      let existingEntry = readEntry.isFulfilled() && readEntry.value().toString('utf8');
      let bundleExists = statBundle.isFulfilled() && !statBundle.value().isDirectory();

      entry.exists = existingEntry && bundleExists && (existingEntry === entry.content);
      if (entry.exists) return;

      return clean([entry.path, entry.bundlePath])
      .then(function () {
        return write(entry.path, entry.content, { encoding: 'utf8' });
      });
    });
  }

  // unlinks files, swallows missing file errors
  clean(paths) {
    return resolve(
      _.flatten([paths]).map(function (path) {
        return rimraf(path);
      })
    )
    .settle()
    .then(_.noop);
  }

  dirContents() {
    let dir = this.dir;

    return readdir(dir).map(function (name) {
      // skip '.', '..', and dot-prefixed files
      if (name.charAt(0) === '.' || name === 'sourcemaps') return false;
      return join(dir, name);
    })
    .then(_.compact);
  }

  getUnkownBundleFiles() {
    let entriesByPath = _.indexBy(this.entries, 'path');
    let entriesByBundlePath = _.indexBy(this.entries, 'bundlePath');

    return this.dirContents()
    .map(function (path) {
      return entriesByPath[path] || entriesByBundlePath[path];
    })
    .then(_.compact)
    .then(this.clean);
  }

  getEntriesToCompile() {
    return _.transform(this.entries, function (map, entry) {
      if (!entry.exists) map[entry.id] = entry.path;
    }, {});
  }
}

module.exports = OptmzBundles;
