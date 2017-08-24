import { get, throttle } from 'lodash';

export default function (editor) {
  const resize = editor.resize;
  return throttle(() => {
    let scrollToRow = get(editor.getCursorPosition(), 'row', 0);
    let center = true;
    if (scrollToRow === 0) {
      scrollToRow = get(editor, 'peggedRow', 0);
      center = false;
    }
    resize.call(editor);

    // Keep current cursor or top line in view when resizing to avoid losing user context
    if (scrollToRow !== 0) {
      editor.renderer.scrollToLine(scrollToRow, center, false, () => {});
    }
  }, 35);
}
