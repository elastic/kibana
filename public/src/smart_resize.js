import { throttle } from 'lodash';

module.exports = function (editor) {

  let lastDemensions = [];
  let resize = editor.resize;
  let throttle = 250;
  let timeout = null;

  function exec() {
    timeout = null;

    const $container = editor.$el.parent();
    const demensions = [$container.width(), $container.height()];
    const [ width, height ] = demensions;
    const [ lastWidth, lastHieght ] = lastDemensions;
    lastDemensions = demensions;

    if (width !== lastWidth || height !== lastHieght) {
      resize.call(editor, true);
      schedule();
    }
  }

  function schedule() {
    if (!timeout) timeout = setTimeout(exec, throttle);
  }

  return schedule;
};
