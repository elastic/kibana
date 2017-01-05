let { includes, flow, escapeRegExp } = require('lodash');
let { isString, isArray, isPlainObject, get } = require('lodash');
let { keys } = require('lodash');
const fromRoot = require('../utils/fromRoot');

const asRegExp = flow(
  escapeRegExp,
  function (path) {
    const last = path.slice(-1);
    if (last === '/' || last === '\\') {
      // match a directory explicitly
      return path + '.*';
    } else {
      // match a directory or files or just the absolute path
      return path + '(?:\\.js$|$|\\\\|\\/)?';
    }
  },
  RegExp
);

const arr = v => [].concat(v || []);

module.exports = class UiBundlerEnv {
  constructor(workingDir) {

    // the location that bundle entry files and all compiles files will
    // be written
    this.workingDir = workingDir;

    // the context that the bundler is running in, this is not officially
    // used for anything but it is serialized into the entry file to ensure
    // that they are invalidated when the context changes
    this.context = {};

    // the plugins that are used to build this environment
    // are tracked and embedded into the entry file so that when the
    // environment changes we can rebuild the bundles
    this.pluginInfo = [];

    // regular expressions which will prevent webpack from parsing the file
    this.noParse = [
      /node_modules[\/\\](angular|elasticsearch-browser)[\/\\]/,
      /node_modules[\/\\](mocha|moment)[\/\\]/
    ];

    // webpack aliases, like require paths, mapping a prefix to a directory
    this.aliases = {
      ui: fromRoot('src/ui/public'),
      testHarness: fromRoot('src/testHarness/public'),
      querystring: 'querystring-browser',
    };

    // map of which plugins created which aliases
    this.aliasOwners = {};

    // webpack loaders map loader configuration to regexps
    this.loaders = [];
    this.postLoaders = [];
  }

  consumePlugin(plugin) {
    const tag = `${plugin.id}@${plugin.version}`;
    if (includes(this.pluginInfo, tag)) return;

    if (plugin.publicDir) {
      this.aliases[`plugins/${plugin.id}`] = plugin.publicDir;
    }

    this.pluginInfo.push(tag);
  }

  exportConsumer(type) {
    switch (type) {
      case 'loaders':
        return (plugin, spec) => {
          for (let loader of arr(spec)) this.addLoader(loader);
        };

      case 'postLoaders':
        return (plugin, spec) => {
          for (let loader of arr(spec)) this.addPostLoader(loader);
        };

      case 'noParse':
        return (plugin, spec) => {
          for (let re of arr(spec)) this.addNoParse(re);
        };

      case 'modules':
        return (plugin, spec) => {
          for (let id of keys(spec)) this.addModule(id, spec[id], plugin.id);
        };
    }
  }

  addContext(key, val) {
    this.context[key] = val;
  }

  addLoader(loader) {
    this.loaders.push(loader);
  }

  addPostLoader(loader) {
    this.postLoaders.push(loader);
  }

  addNoParse(regExp) {
    this.noParse.push(regExp);
  }

  addModule(id, spec, pluginId) {
    this.claim(id, pluginId);

    // configurable via spec
    let path;
    let parse = true;
    let imports = null;
    let exports = null;
    let expose = null;

    // basic style, just a path
    if (isString(spec)) path = spec;

    if (isArray(spec)) {
      path = spec[0];
      imports = spec[1];
      exports = spec[2];
    }

    if (isPlainObject(spec)) {
      path = spec.path;
      parse = get(spec, 'parse', parse);
      imports = get(spec, 'imports', imports);
      exports = get(spec, 'exports', exports);
      expose = get(spec, 'expose', expose);
    }

    if (!path) {
      throw new TypeError('Invalid spec definition, unable to identify path');
    }

    this.aliases[id] = path;

    const loader = [];
    if (imports) {
      loader.push(`imports?${imports}`);
    }

    if (exports) loader.push(`exports?${exports}`);
    if (expose) loader.push(`expose?${expose}`);
    if (loader.length) this.loaders.push({ test: asRegExp(path), loader: loader.join('!') });
    if (!parse) this.addNoParse(path);
  }

  claim(id, pluginId) {
    const owner = pluginId ? `Plugin ${pluginId}` : 'Kibana Server';

    // TODO(spalger): we could do a lot more to detect colliding module defs
    const existingOwner = this.aliasOwners[id] || this.aliasOwners[`${id}$`];

    if (existingOwner) {
      throw new TypeError(`${owner} attempted to override export "${id}" from ${existingOwner}`);
    }

    this.aliasOwners[id] = owner;
  }
};
