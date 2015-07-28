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

let entryFileTemplate = _.template(readSync(join(__dirname, 'entry.js.tmpl')));

class OptmzBundles {
  constructor(opts, optimizerTagline) {
    this.dir = _.get(opts, 'bundleDir');
    if (!_.isString(this.dir)) {
      throw new TypeError('Optimizer requires a working directory');
    }

    this.sourceMaps = _.get(opts, 'sourceMaps');
    this.entries = _.get(opts, 'entries', []).map(function (spec) {
      let entry = {
        id: spec.id,
        deps: _.get(spec, 'deps', []),
        modules: _.get(spec, 'modules', []),

        path: join(this.dir, spec.id + '.entry.js'),
        bundlePath: join(this.dir, spec.id + '.bundle.js'),

        exists: undefined,
        content: undefined
      };

      entry.content = _.get(spec, 'template', entryFileTemplate)({
        entry: entry,
        optimizerTagline: optimizerTagline
      });

      return entry;
    }, this);


    _.bindAll(this, [
      'ensureDir',
      'ensureAllEntriesExist',
      'checkIfEntryExists',
      'writeEntryFile',
      'clean',
      'getMissingEntries',
      'getEntriesConfig'
    ]);
  }

  ensureDir() {
    return mkdirp(this.dir);
  }

  ensureAllEntriesExist(overwrite) {
    return this.ensureDir()
    .return(this.entries)
    .map(overwrite ? this.checkIfEntryExists : _.noop)
    .return(this.entries)
    .map(this.writeEntryFile)
    .return(undefined);
  }

  checkIfEntryExists(entry) {
    return resolve([
      read(entry.path),
      stat(entry.bundlePath)
    ])
    .settle()
    .spread(function (readEntry, statBundle) {
      let existingEntry = readEntry.isFulfilled() && readEntry.value().toString('utf8');
      let bundleExists = statBundle.isFulfilled() && !statBundle.value().isDirectory();
      entry.exists = existingEntry && bundleExists && (existingEntry === entry.content);
    });
  }

  writeEntryFile(entry) {
    return this.clean([entry.path, entry.bundlePath]).then(function () {
      entry.exists = false;
      return write(entry.path, entry.content, { encoding: 'utf8' });
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
    .return(undefined);
  }

  getMissingEntries() {
    return _.reject(this.entries, 'exists');
  }

  getEntriesConfig() {
    return _.transform(this.getMissingEntries(), function (map, entry) {
      map[entry.id] = entry.path;
    }, {});
  }
}

module.exports = OptmzBundles;
