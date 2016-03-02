var $ = require('jquery');

module.exports = function appendTitle($elem, title) {
  var titleElem = $('.chart-title', $elem);
  var canvasElem = $('.chart-canvas', $elem);
  var titleSize = 9;

  if (title) {
    titleElem.height(titleSize);
    canvasElem.height($elem.height() - titleSize);
    titleElem.text(title);
  } else {
    titleElem.height(0);
    canvasElem.height($elem.height());
    titleElem.text(null);
  }
};
