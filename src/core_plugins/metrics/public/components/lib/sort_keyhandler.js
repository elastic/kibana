import { keyCodes } from '@elastic/eui';

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
