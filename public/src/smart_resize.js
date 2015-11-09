import { throttle } from 'lodash';

module.exports = function (editor) {
  let resize = editor.resize;
  let lastDemensions = [];

  let checkDelay = 250;
  let recheckDelay = 500;
  let stableAfter = 5000;
  let timeouts = [];

  let stableChecks = 0;
  let maxStableChecks = stableAfter / recheckDelay;

  function exec() {
    timeouts.splice(0).map(clearTimeout);

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
      scheduleRecheck();
    }
  }

  function requestResize() {
    stableChecks = 0;
    if (!timeouts[0]) timeouts[0] = setTimeout(exec, checkDelay);
  }

  function scheduleRecheck() {
    if (!timeouts[1]) timeouts[1] = setTimeout(exec, recheckDelay);
  }

  return requestResize;
};
