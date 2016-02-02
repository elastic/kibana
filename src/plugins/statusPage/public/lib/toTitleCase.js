const _ = require('lodash');

// Turns thisIsASentence to
// This Is A Sentence
module.exports = function toTitleCase(name) {
  return name
  .split(/(?=[A-Z])/)
  .map(function (word) { return word[0].toUpperCase() + _.rest(word).join(''); })
  .join(' ');
};
