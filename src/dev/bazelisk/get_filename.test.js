/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { getFilename } = require('./get_filename');

describe('#getFilename', () => {
  it('assembles bazelisk-darwin-amd64', () => {
    expect(getFilename('darwin', 'x64')).toBe('bazelisk-darwin-amd64');
  });

  it('assembles bazelisk-darwin-arm64', () => {
    expect(getFilename('darwin', 'arm64')).toBe('bazelisk-darwin-arm64');
  });

  it('assembles bazelisk-linux-amd64', () => {
    expect(getFilename('linux', 'x64')).toBe('bazelisk-linux-amd64');
  });

  it('assembles bazelisk-linux-arm64', () => {
    expect(getFilename('linux', 'arm64')).toBe('bazelisk-linux-arm64');
  });

  it('assembles bazelisk-windows-amd64.exe', () => {
    expect(getFilename('win32', 'x64')).toBe('bazelisk-windows-amd64.exe');
  });
});
