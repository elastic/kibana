// Extracted from Flow, MIT licensed, Copyright (c) 2014-present, Facebook, Inc.
// https://github.com/facebook/jest/blob/216e8edbe8ca60b34688d03e8ef3cb7262104b51/packages/jest-environment-jsdom/src/index.js#L37-L42

const started = process.hrtime();

window.requestAnimationFrame = callback => {
  const hr = process.hrtime(started);
  const hrInNano = hr[0] * 1e9 + hr[1];
  const hrInMicro = hrInNano / 1e6;

  return global.setTimeout(callback, 0, hrInMicro);
};

window.cancelAnimationFrame = id => {
  window.clearTimeout(id);
};
