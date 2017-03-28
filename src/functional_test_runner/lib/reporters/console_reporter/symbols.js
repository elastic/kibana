// originally extracted from mocha https://git.io/v1PGh

export const ok = process.platform === 'win32'
  ? '\u221A'
  : '✓';

export const err = process.platform === 'win32'
  ? '\u00D7'
  : '✖';
