import _ from 'lodash';
import uiModules from 'ui/modules';
// Capitalize the first letter of titlized words

uiModules
.get('kibana')
.filter('capitalize', function () {
  let nonCapitalizedWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'etc', 'on', 'at', 'to', 'from', 'by'];

  function titlize(token) {
    if (_.isString(token)) {
      let words = token.split(' ');
      let str = '';

      words.forEach((word, index) => {
        // Do not capitalize non-capitalized words and always
        // capitalize the first letter of the first word in a title.
        if (_.indexOf(nonCapitalizedWords, word) !== -1 && index !== 0) {
          str = str + word + ' ';
        } else {
          str = str + word.charAt(0).toUpperCase() + word.slice(1) + ' ';
        }

        if (index === words.length - 1) {
          str = str.trim();
        }
      });

      return str;
    }

    return token;
  };

  function isAllStrings(value) {
    if (_.isString(value)) return true;

    if (_.isArray(value)) {
      return value.every((item) => {
        return _.isString(item);
      });
    }

    return false;
  }

  titlize.nonCapitalizedWords = function (v) {
    if (!arguments.length) return nonCapitalizedWords;
    if (!isAllStrings(v)) {
      throw new Error('titlize.nonCapitalizedWords expects a string or array of strings as input');
    }
    nonCapitalizedWords = _.isArray(v) ? v : nonCapitalizedWords.push(v);
    return titlize;
  };

  return titlize;
});
