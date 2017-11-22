import { keyCodes } from 'ui_framework/services';

export function createUpDownHandler(callback) {
  return (ev) => {
    if (ev.keyCode === keyCodes.UP) {
      ev.preventDefault();
      callback('up');
    } else if (ev.keyCode === keyCodes.DOWN) {
      ev.preventDefault();
      callback('down');
    }
  };
}
