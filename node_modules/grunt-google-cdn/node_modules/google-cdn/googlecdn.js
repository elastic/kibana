'use strict';

var semver = require('semver');
var debug = require('debug')('google-cdn');

var replacements = require('./lib/data').replacements;
var versions = require('./lib/data').versions;
var bowerUtil = require('./util/bower');
var hoist = require('./util/hoist');

var CDN_AJAX_PATH = '//ajax.googleapis.com/ajax/libs/';


function getVersionStr(bowerJson, name) {
  var versionStr;
  if (bowerJson.dependencies) {
    versionStr = bowerJson.dependencies[name];
  }

  if (!versionStr && bowerJson.devDependencies && bowerJson.devDependencies[name]) {
    versionStr = bowerJson.devDependencies[name];
  }

  return versionStr;
}


module.exports = function cdnify(content, bowerJson, options) {
  options = options || {};
  options.componentsPath = options.componentsPath || 'bower_components';

  Object.keys(replacements).forEach(function (item) {
    var replacement = replacements[item];
    var versionStr = getVersionStr(bowerJson, item);

    if (!versionStr) {
      return;
    }

    var version = semver.maxSatisfying(versions[item], versionStr);
    if (version) {
      debug('Choosing version %s for dependency %s', version, item);

      var from = bowerUtil.joinComponent(options.componentsPath, replacement.from);
      var to = replacement.to(version);
      content = content.replace(from, to);

      debug('Replaced %s with %s', from, to);
    } else {
      debug('Could not find satisfying version for %s %s', item, versionStr);
    }
  });

  var linesToMove = [];
  content.split('\n').forEach(function (line) {
    if (line.indexOf(CDN_AJAX_PATH) !== -1) {
      linesToMove.push(line);
    }
  });

  try {
    content = hoist({
      body: content,
      marker: '<!-- build:js scripts/scripts.js -->',
      move: linesToMove
    });
  } catch (e) {
    debug('Hoisting failed: %s', e);
  }

  return content;
};
