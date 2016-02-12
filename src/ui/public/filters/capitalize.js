import _ from 'lodash';
import uiModules from 'ui/modules';
// Capitalize the first letter of titlized words

uiModules
.get('kibana')
.filter('capitalize', function () {
  const nonCapitalizedWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'etc', 'on', 'at', 'to', 'from', 'by'];

  return function (token) {
    if (!_.isString(token)) return token;

    const words = token.split(' ');
    let str = '';

    words.forEach((word, index) => {
      // Always capitalize the first letter of the first word in a title.
      if (_.indexOf(nonCapitalizedWords, word) !== -1 && index !== 0) {
        str = str + word + ' ';
      }

      if (index === words.length - 1) {
        str = str + word.charAt(0).toUpperCase() + word.slice(1);
      } else {
        str = str + word.charAt(0).toUpperCase() + word.slice(1) + ' ';
      }
    });

    return str;
  };
});
