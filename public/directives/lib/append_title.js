var $ = require('jquery');

module.exports = function appendTitle($elem, title) {
  var titleElem = $('.chart-title', $elem);
  var canvasElem = $('.chart-canvas', $elem);
  var titleSize = 9;

  if (title) {
    titleElem.height(titleSize);
    titleElem.text(title);
  } else {
    titleElem.height(0);
    titleElem.text(null);
  }
};
