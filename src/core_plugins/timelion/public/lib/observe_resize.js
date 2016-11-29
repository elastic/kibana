module.exports = function ($elem, fn, frequency) {

  frequency = frequency || 500;
  var currentHeight = $elem.height();
  var currentWidth = $elem.width();

  var timeout;

  function checkLoop() {
    timeout = setTimeout(function () {
      if (currentHeight !== $elem.height() || currentWidth !== $elem.width()) {
        currentHeight = $elem.height();
        currentWidth = $elem.width();

        if (currentWidth > 0 && currentWidth > 0) fn();
      }
      checkLoop();
    }, frequency);
  }

  checkLoop();

  return function () {
    clearTimeout(timeout);
  };


};
