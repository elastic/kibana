import { throttle } from 'lodash';

export default function (editor) {
  const resize = editor.resize;
  return throttle(() => resize.call(editor), 35)
}
