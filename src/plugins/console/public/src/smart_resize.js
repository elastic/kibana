import { throttle } from 'lodash';

module.exports = function (editor) {
  let resize = editor.resize;
  let lastDemensions = [];
  let timeout = null;

  let checkDelay = 250;
  let stableChecks = 0;
  let maxStableChecks = 20;

  function check() {
    clearTimeout(timeout);

    const $container = editor.$el.parent();
    const demensions = [$container.width(), $container.height()];
    const [ width, height ] = demensions;
    const [ lastWidth, lastHieght ] = lastDemensions;
    lastDemensions = demensions;

    if (width !== lastWidth || height !== lastHieght) {
      resize.call(editor, true);
      stableChecks = 0;
    } else {
      stableChecks += 1;
    }

    if (stableChecks < maxStableChecks) {
      scheduleCheck();
    }
  }

  function scheduleCheck() {
    if (!timeout) timeout = setTimeout(check, checkDelay);
  }

  function requestResize() {
    stableChecks = 0;
    scheduleCheck();
  }

  return requestResize;
};
