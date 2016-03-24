import { throttle } from 'lodash';

module.exports = function (editor) {
  return throttle(() => editor.resize(), 35)
};
