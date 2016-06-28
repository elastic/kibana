/* jshint node:true, esnext:true */

'use strict';

var uniq = require('lodash').uniq;
var loaderUtils = require('loader-utils');
var SourceNode = require('source-map').SourceNode;
var SourceMapConsumer = require('source-map').SourceMapConsumer;

var amdRequireRE = /define\(function\s*\(/;
var commentRE = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;
var requireRE = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g;

var HEADER = '/*** auto-preload-rjscommon-deps-loader ***/\n';

module.exports = function(content, map) {
  this.cacheable();

  if (!content.match(amdRequireRE)) {
    return this.callback(null, content, map);
  }

  var sourceNode;

  if (map) {
    sourceNode = SourceNode.fromStringWithSourceMap(content, new SourceMapConsumer(map));
  } else {
    var fileName = loaderUtils.getRemainingRequest(this);
    sourceNode = new SourceNode(null, null, null);
    content.split('\n').forEach(function(line, idx) {
      sourceNode.add(new SourceNode(idx + 1, 0, fileName, line + '\n'));
    });
    sourceNode.setSourceContent(fileName, content);
  }

  var concatSrc = new SourceNode();

  var deps = [];
  content
  .replace(commentRE, '')
  .replace(requireRE, function (match, dep) {
    deps.push('require(\'' + dep + '\');');
  });

  concatSrc.add([
    deps.length ? HEADER + uniq(deps).join('\n') + '\n\n' : '',
    sourceNode,
  ]);

  var result = concatSrc.toStringWithSourceMap();
  this.callback(undefined, result.code, result.map.toString());
};
