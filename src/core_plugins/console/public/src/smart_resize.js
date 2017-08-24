import { get, throttle } from 'lodash';

export default function (editor) {
  const resize = editor.resize;
  return throttle(() => {
    let userRow = get(editor.getCursorPosition(), 'row', 0);
    let center = true;
    if (userRow === 0) {
      userRow = get(editor, 'peggedRow', 0);
      center = false;
    }
    resize.call(editor);

    // Keep current cursor or top line in view when resizing to avoid losing user context
    if (userRow !== 0) {
      editor.renderer.scrollToLine(userRow, center, false, () => {});
    }
  }, 35);
}
