export default function ($elem, fn, frequency) {

  frequency = frequency || 500;
  let currentHeight = $elem.height();
  let currentWidth = $elem.width();

  let timeout;

  function checkLoop() {
    timeout = setTimeout(function () {
      const widthDiff = Math.abs(currentHeight - $elem.height());
      const heightDiff = Math.abs(currentWidth - $elem.width());
      const sizeHasChanged = widthDiff > 1 || heightDiff > 1;
      if (sizeHasChanged) {
        currentHeight = $elem.height();
        currentWidth = $elem.width();
        if (currentWidth > 0 && currentWidth > 0) {
          fn();
        }
      }
      checkLoop();
    }, frequency);
  }

  checkLoop();

  return function () {
    clearTimeout(timeout);
  };


}
