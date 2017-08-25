import { get, throttle } from 'lodash';

module.exports = function (editor) {
  const resize = editor.resize;
  const throttledResize = throttle(() => {

    resize.call(editor);

    // Keep current top line in view when resizing to avoid losing user context
    let userRow = get(throttledResize, 'topRow', 0);
    if (userRow !== 0) {
      editor.renderer.scrollToLine(userRow, false, false, () => {});
    }
  }, 35);
  return throttledResize;
}
