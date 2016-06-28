'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _cssSelectorTokenizer = require('css-selector-tokenizer');

var _cssSelectorTokenizer2 = _interopRequireDefault(_cssSelectorTokenizer);

var hasOwnProperty = Object.prototype.hasOwnProperty;

function getSingleLocalNamesForComposes(selectors) {
  return selectors.nodes.map(function (node) {
    if (node.type !== 'selector' || node.nodes.length !== 1) {
      throw new Error('composes is only allowed when selector is single :local class name not in "' + _cssSelectorTokenizer2['default'].stringify(selectors) + '"');
    }
    node = node.nodes[0];
    if (node.type !== 'nested-pseudo-class' || node.name !== 'local' || node.nodes.length !== 1) {
      throw new Error('composes is only allowed when selector is single :local class name not in "' + _cssSelectorTokenizer2['default'].stringify(selectors) + '", "' + _cssSelectorTokenizer2['default'].stringify(node) + '" is weird');
    }
    node = node.nodes[0];
    if (node.type !== 'selector' || node.nodes.length !== 1) {
      throw new Error('composes is only allowed when selector is single :local class name not in "' + _cssSelectorTokenizer2['default'].stringify(selectors) + '", "' + _cssSelectorTokenizer2['default'].stringify(node) + '" is weird');
    }
    node = node.nodes[0];
    if (node.type !== 'class') {
      // 'id' is not possible, because you can't compose ids
      throw new Error('composes is only allowed when selector is single :local class name not in "' + _cssSelectorTokenizer2['default'].stringify(selectors) + '", "' + _cssSelectorTokenizer2['default'].stringify(node) + '" is weird');
    }
    return node.name;
  });
}

var processor = _postcss2['default'].plugin('postcss-modules-scope', function (options) {
  return function (css) {
    var generateScopedName = options && options.generateScopedName || processor.generateScopedName;

    var exports = {};

    function exportScopedName(name) {
      var scopedName = generateScopedName(name, css.source.input.from, css.source.input.css);
      exports[name] = exports[name] || [];
      if (exports[name].indexOf(scopedName) < 0) {
        exports[name].push(scopedName);
      }
      return scopedName;
    }

    function localizeNode(node) {
      var newNode = Object.create(node);
      switch (node.type) {
        case 'selector':
          newNode.nodes = node.nodes.map(localizeNode);
          return newNode;
        case 'class':
        case 'id':
          var scopedName = exportScopedName(node.name);
          newNode.name = scopedName;
          return newNode;
      }
      throw new Error(node.type + ' ("' + _cssSelectorTokenizer2['default'].stringify(node) + '") is not allowed in a :local block');
    }

    function traverseNode(node) {
      switch (node.type) {
        case 'nested-pseudo-class':
          if (node.name === 'local') {
            if (node.nodes.length !== 1) {
              throw new Error('Unexpected comma (",") in :local block');
            }
            return localizeNode(node.nodes[0]);
          }
        /* falls through */
        case 'selectors':
        case 'selector':
          var newNode = Object.create(node);
          newNode.nodes = node.nodes.map(traverseNode);
          return newNode;
      }
      return node;
    }

    // Find any :import and remember imported names
    var importedNames = {};
    css.eachRule(function (rule) {
      if (/^:import\(.+\)$/.test(rule.selector)) {
        rule.eachDecl(function (decl) {
          importedNames[decl.prop] = true;
        });
      }
    });

    // Find any :local classes
    css.eachRule(function (rule) {
      var selector = _cssSelectorTokenizer2['default'].parse(rule.selector);
      var newSelector = traverseNode(selector);
      rule.selector = _cssSelectorTokenizer2['default'].stringify(newSelector);
      rule.eachDecl('composes', function (decl) {
        var localNames = getSingleLocalNamesForComposes(selector);
        var classes = decl.value.split(/\s+/);
        classes.forEach(function (className) {
          if (hasOwnProperty.call(importedNames, className)) {
            localNames.forEach(function (exportedName) {
              exports[exportedName].push(className);
            });
          } else if (hasOwnProperty.call(exports, className)) {
            localNames.forEach(function (exportedName) {
              exports[className].forEach(function (item) {
                exports[exportedName].push(item);
              });
            });
          } else {
            throw decl.error('referenced class name "' + className + '" in composes not found');
          }
        });
        decl.removeSelf();
      });
      rule.eachDecl(function (decl) {
        var tokens = decl.value.split(/(,|'[^']*'|"[^"]*")/);
        tokens = tokens.map(function (token, idx) {
          if (idx === 0 || tokens[idx - 1] === ',') {
            var localMatch = /^(\s*):local\s*\((.+?)\)/.exec(token);
            if (localMatch) {
              return localMatch[1] + exportScopedName(localMatch[2]) + token.substr(localMatch[0].length);
            } else {
              return token;
            }
          } else {
            return token;
          }
        });
        decl.value = tokens.join('');
      });
    });

    // Find any :local keyframes
    css.eachAtRule(function (atrule) {
      if (/keyframes$/.test(atrule.name)) {
        var localMatch = /^\s*:local\s*\((.+?)\)\s*$/.exec(atrule.params);
        if (localMatch) {
          atrule.params = exportScopedName(localMatch[1]);
        }
      }
    });

    // If we found any :locals, insert an :export rule
    var exportedNames = Object.keys(exports);
    if (exportedNames.length > 0) {
      css.append(_postcss2['default'].rule({
        selector: ':export',
        nodes: exportedNames.map(function (exportedName) {
          return _postcss2['default'].decl({
            prop: exportedName,
            value: exports[exportedName].join(' '),
            before: '\n  ',
            _autoprefixerDisabled: true
          });
        })
      }));
    }
  };
});

processor.generateScopedName = function (exportedName, path) {
  var sanitisedPath = path.replace(/\.[^\.\/\\]+$/, '').replace(/[\W_]+/g, '_').replace(/^_|_$/g, '');
  return '_' + sanitisedPath + '__' + exportedName;
};

exports['default'] = processor;
module.exports = exports['default'];