var _ = require('lodash');
var argv = require('./argv');

if (!argv.omit) {
  module.exports = _.identity;
  return;
}

var paths = (_.isArray(argv.omit) ? argv.omit : [argv.omit]).map(parseStringPropertyPath);

module.exports = function (body, isFieldMap) {
  isFieldMap = !!isFieldMap;
  paths.forEach(function (path) {
    unDefine(body, path);
  });

  function unDefine(obj, path) {
    if (!obj) return;

    var step = path.shift();
    var next = obj[step];

    if (path.length === 0) {
      // end of the line
      obj[step] = next = undefined;
    }
    else if (next && step === '[]') {
      walkIn(next, path);
    }
    else if (next) {
      // FIXME Make this prettier
      if(isFieldMap) {
        unDefine(next.properties, path);
      } else {
        unDefine(next, path);
      }
    }

    path.unshift(step);
  }

  function walkIn(arr, path) {
    if (!_.isArray(arr)) return;

    arr.forEach(function (obj) {
      unDefine(obj, path);
    });
  }

  return body;
};


//
// From lodash-deep
//
// https://github.com/marklagendijk/lodash-deep/blob/master/lodash-deep.js#L419-L474
//
/**
 * Parses a string based propertyPath
 * @param {string} propertyPath
 * @returns {Array}
 */
function parseStringPropertyPath(propertyPath) {
  var character = '';
  var parsedPropertyPath = [];
  var parsedPropertyPathPart = '';
  var escapeNextCharacter = false;
  var isSpecialCharacter = false;
  var insideBrackets = false;

  // Walk through the path and find backslashes that escape periods or other backslashes, and split on unescaped
  // periods and brackets.
  for (var i = 0; i < propertyPath.length; i++) {
    character = propertyPath[i];
    isSpecialCharacter = (character === '\\' || character === '[' || character === ']' || character === '.');

    if (isSpecialCharacter && !escapeNextCharacter) {
      if (insideBrackets && character !== ']') {
        throw new SyntaxError(
          'unexpected "' + character + '" within brackets at character ' +
          i + ' in property path ' + propertyPath
        );
      }

      switch (character) {
        case '\\':
          escapeNextCharacter = true;
          break;
        case ']':
          insideBrackets = false;
          break;
        case '[':
          insideBrackets = true;
          /* falls through */
        case '.':
          parsedPropertyPath.push(parsedPropertyPathPart);
          parsedPropertyPathPart = '';
          break;
      }
    } else {
      parsedPropertyPathPart += character;
      escapeNextCharacter = false;
    }
  }

  if (parsedPropertyPath[0] === '') {
    //allow '[0]', or '.0'
    parsedPropertyPath.splice(0, 1);
  }

  // capture the final part
  parsedPropertyPath.push(parsedPropertyPathPart);
  return parsedPropertyPath;
}
