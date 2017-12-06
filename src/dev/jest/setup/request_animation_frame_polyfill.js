// requestAnimationFrame isn't available in node so we need to polyfill it.
// Borrowed from https://gist.github.com/paulirish/1579671.
window.requestAnimationFrame = (() => {
  let clock = Date.now();

  return callback => {
    const currentTime = Date.now();

    if (currentTime - clock > 16) {
      clock = currentTime;
      callback(currentTime);
    } else {
      setTimeout(() => {
        window.requestAnimationFrame(callback);
      }, 0);
    }
  };
})();
