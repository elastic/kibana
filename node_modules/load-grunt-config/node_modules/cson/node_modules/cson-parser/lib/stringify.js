
/*
Copyright (c) 2014, Groupon, Inc.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.

Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

Neither the name of GROUPON nor the names of its contributors may be
used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var SPACES, isObject, jsIdentifierRE, newlineWrap, tripleQuotesRE,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

jsIdentifierRE = /^[a-z_$][a-z0-9_$]*$/i;

tripleQuotesRE = new RegExp("'''", 'g');

SPACES = '          ';

newlineWrap = function(str) {
  return str && ("\n" + str + "\n");
};

isObject = function(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
};

module.exports = function(data, visitor, indent) {
  var indentLine, indentLines, n, normalized, ref, visitArray, visitNode, visitObject, visitString;
  if ((ref = typeof data) === 'undefined' || ref === 'function') {
    return void 0;
  }
  indent = (function() {
    switch (typeof indent) {
      case 'string':
        return indent.slice(0, 10);
      case 'number':
        n = Math.min(10, Math.floor(indent));
        if (indexOf.call([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], n) < 0) {
          n = 0;
        }
        return SPACES.slice(0, n);
      default:
        return 0;
    }
  })();
  indentLine = function(line) {
    return indent + line;
  };
  indentLines = function(str) {
    if (str === '') {
      return str;
    }
    return str.split('\n').map(indentLine).join('\n');
  };
  normalized = JSON.parse(JSON.stringify(data, visitor));
  visitString = function(str) {
    var string;
    if (str.indexOf('\n') === -1 || !indent) {
      return JSON.stringify(str);
    } else {
      string = str.replace(/\\/g, '\\\\').replace(tripleQuotesRE, "\\'''");
      return "'''" + (newlineWrap(indentLines(string))) + "'''";
    }
  };
  visitArray = function(arr) {
    var items, serializedItems;
    items = arr.map(function(value) {
      return visitNode(value, {
        bracesRequired: true
      });
    });
    serializedItems = indent ? newlineWrap(indentLines(items.join('\n'))) : items.join(',');
    return "[" + serializedItems + "]";
  };
  visitObject = function(obj, arg) {
    var bracesRequired, key, keypairs, serializedKeyPairs, serializedValue, value;
    bracesRequired = arg.bracesRequired;
    keypairs = (function() {
      var results;
      results = [];
      for (key in obj) {
        value = obj[key];
        if (!key.match(jsIdentifierRE)) {
          key = JSON.stringify(key);
        }
        serializedValue = visitNode(value, {
          bracesRequired: !indent
        });
        if (indent) {
          serializedValue = isObject(value) && Object.keys(value).length > 0 ? "\n" + (indentLines(serializedValue)) : " " + serializedValue;
        }
        results.push(key + ":" + serializedValue);
      }
      return results;
    })();
    if (keypairs.length === 0) {
      return '{}';
    } else if (indent) {
      serializedKeyPairs = keypairs.join('\n');
      if (bracesRequired) {
        return "{" + (newlineWrap(indentLines(serializedKeyPairs))) + "}";
      } else {
        return serializedKeyPairs;
      }
    } else {
      serializedKeyPairs = keypairs.join(',');
      if (bracesRequired) {
        return "{" + serializedKeyPairs + "}";
      } else {
        return serializedKeyPairs;
      }
    }
  };
  visitNode = function(node, options) {
    if (options == null) {
      options = {};
    }
    switch (typeof node) {
      case 'boolean':
        return "" + node;
      case 'number':
        if (isFinite(node)) {
          return "" + node;
        } else {
          return 'null';
        }
        break;
      case 'string':
        return visitString(node, options);
      case 'object':
        if (node === null) {
          return 'null';
        } else if (Array.isArray(node)) {
          return visitArray(node, options);
        } else {
          return visitObject(node, options);
        }
    }
  };
  return visitNode(normalized);
};
