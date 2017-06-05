module.exports = function ($elem, fn, frequency) {

  frequency = frequency || 500;
  let currentHeight = $elem.height();
  let currentWidth = $elem.width();

  let timeout;

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
