import { throttle } from 'lodash';

module.exports = function (editor) {
  const resize = editor.resize;
  return throttle(() => resize.call(editor), 35)
};
