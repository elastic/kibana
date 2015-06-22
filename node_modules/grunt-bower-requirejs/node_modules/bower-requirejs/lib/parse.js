'use strict';
var path = require('path');
var _ = require('lodash');
var slash = require('slash');
var assign = require('object-assign');
var slice = Array.prototype.slice;
var chalk = require('chalk');
var warn = chalk.black.bgYellow;
var danger = chalk.black.bgRed;
var primary = require('./primary');

/**
 * Parse bower dependency down to one or more primary
 * js files.
 */
module.exports = function (dep, name, baseUrl) {

  /**
   * Fixup slashes in file paths for windows
   */
  function normalizePath(str) {
    return process.platform === 'win32' ? slash(str) : str;
  }
  
  function parsePackage(dep, name, baseUrl) {
    var canonicalDir = dep.canonicalDir;
    var main =  dep.pkgMeta.main || 'main.js';

    if (dep.missing) {
      console.error(danger('ERR'), dep.endpoint.name, 'is not installed in your bower components directory');
      throw new Error('Missing dependency');
    }

    // If location does not start with leading slash, assume it is
    // relative canonical dir.
    var location = path.relative(baseUrl, canonicalDir);
    if (dep.pkgMeta.location) {
      var isAbsolute = (dep.pkgMeta.location.indexOf('/') === 0);
      var hasProtocol = /^\w:\/\//.test(dep.pkgMeta.location);
      if (isAbsolute || hasProtocol) {
        location = dep.pkgMeta.location;
      } else {
        var relToCanonical = path.join(canonicalDir, dep.pkgMeta.location);
        location = path.relative(baseUrl, relToCanonical);
      }
    }

    var configElement = {
      type: 'package',
      package: {
        name: name,
        main: main,
        location: normalizePath(location)
      }
    };
    return configElement;
  }

  function parsePaths(dep, name, baseUrl) {
    var canonicalDir = dep.canonicalDir;
    var main;

    if (dep.pkgMeta.main) {
      var pkgMain = dep.pkgMeta.main;
      if (!Array.isArray(pkgMain)) {
        pkgMain = [pkgMain];
      }
      main = _.filter(pkgMain, function (dep) {
        var extname = path.extname(dep);
        return !extname || extname === '.js';
      });
    }

    /**
     * Get resolved paths for dependency.
     */
    function getResolvedPaths() {
      // If no `main` is listed in the bower.json
      if (!main) {
        // Look for top level js, otherwise
        // bail out.
        main = primary(name, dep);
        if (!main) {
          return false;
        }
      }

      // If main should be turned into an Array
      if (Array.isArray(main)) {
        dep = main;
      } else {
        dep = [main];
      }

      // If there are multiple files filter to
      // only the js ones
      if (dep.length > 1) {
        dep = filter(dep);
      }

      var resolvedPaths = {};
      var resolve = resolver(resolvedPaths);
      _.each(dep, resolve);
      return resolvedPaths;
    }

    /**
     * Filter an Array down to only js files
     */
    function filter(arr) {
      var jsfiles = _.filter(arr, function (val) {
        return path.extname(val) === '.js';
      });

      return jsfiles;
    }

    /**
     * Disambiguate a dependency path if a dependency was
     * not explicitly listed in bower.json's main array
     * Some dependencies have multiple paths because there is more
     * than one .js file in bower.json's main attribute.
     */
    function resolver(dependencies) {
      return function (val, index, arr) {
        if (arr.length > 1) {
          assign(dependencies, dependencyByFilename(val));
        } else {
          assign(dependencies, dependencyByComponentName(name, val));
        }
      };
    }

    /**
     * Create dependency based off of filename
     */
    function dependencyByFilename(val) {
      var dep = {};
      var name = getName(path.basename(val));
      var filepath = getPath(val);
      dep[name] = filepath;
      return dep;
    }

    /**
     * Create dependency based off of component name
     */
    function dependencyByComponentName(componentName, val) {
      var dep = {};
      var name = getName(componentName);
      var filepath = getPath(val);
      dep[name] = filepath;
      return dep;
    }

    /**
     * Return a dependency name that strips out extensions
     * like .js or .min
     */
    function getName(name) {
      return filterName(name, 'js', 'min');
    }

    /**
     * Return a dependency path that is relative to the baseUrl
     * and has normalized slashes for Windows users
     */
    function getPath(val) {
      var filepath = relative(canonical(removeExtension(val, 'js')));
      filepath = normalizePath(filepath);
      return filepath;
    }

    /**
     * Remove extensions from file paths but ignore folders
     */
    function removeExtension(filepath, extension) {
      var newPath;
      if (extension[0] !== '.') {
        extension = '.'.concat(extension);
      }
      newPath = path.join(path.dirname(filepath), path.basename(filepath, extension));
      return newPath;
    }

    /**
     * Remove '.' separated extensions from library/file names
     * ex: filterName('typeahead.js', 'js') returns 'typeahead'
     * ex: filterName('foo.min.js', 'js, 'min') returns 'foo'
     */
    function filterName() {
      var oldName = arguments[0];
      var newName = _.difference(oldName.split('.'), slice.call(arguments, 1));

      // Re-attach any leftover pieces
      // ex: handlebars.runtime.js becomes handlebars.runtime
      if (newName.length > 1) {
        newName = newName.join('.');
      } else {
        newName = newName[0];
      }

      if (newName !== oldName) {
        console.log(warn('WARN'), 'Renaming ' + oldName + ' to ' + newName + '\n');
      }

      return newName;
    }

    /**
     * Combine the main.js file with its canonicalDir to
     * produce a full file path
     */
    function canonical(filepath) {
      return path.join(canonicalDir, filepath);
    }

    /**
     * Generate a relative path name using the baseUrl. If
     * baseUrl was not defined then it will just use the dir
     * that contains the rjs config file.
     */
    function relative(filepath) {
      return path.relative(baseUrl, filepath);
    }

    var resolvedPaths = getResolvedPaths();
    var configElement = {
      type: 'paths',
      paths: resolvedPaths
    };

    return configElement;
  }

  // Check for module type.
  var moduleTypes = dep.pkgMeta.moduleType || [];
  var canSupportNode = moduleTypes.indexOf("node") !== -1;
  var canSupportAmd = moduleTypes.indexOf("amd") !== -1;
  if (canSupportNode && !canSupportAmd) {
    return parsePackage(dep, name, baseUrl);
  }

  // Parse as paths if not package.
  return parsePaths(dep, name, baseUrl);

};
