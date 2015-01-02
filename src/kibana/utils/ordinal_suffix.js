define(function (require) {
  // adopted from http://stackoverflow.com/questions/3109978/php-display-number-with-ordinal-suffix
  var _ = require('lodash');
  return function addOrdinalSuffix(num) {
    return num + '' + suffix(num);
  };

  function suffix(num) {
    var int = Math.floor(parseFloat(num));

    var hunth = int % 100;
    if (hunth >= 11 && hunth <= 13) return 'th';

    var tenth = int % 10;
    if (tenth === 1) return 'st';
    if (tenth === 2) return 'nd';
    if (tenth === 3) return 'rd';
    return 'th';
  }
});