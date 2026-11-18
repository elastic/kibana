/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveDiagnosticDir } from './resolve_diagnostic_dir';

describe('resolveDiagnosticDir', () => {
  it('reads --diagnostic-dir from command-line flags', () => {
    expect(resolveDiagnosticDir(['--diagnostic-dir=/a'], '')).toBe('/a');
  });

  it('reads --diagnostic-dir from NODE_OPTIONS', () => {
    expect(resolveDiagnosticDir([], '--max-old-space-size=1 --diagnostic-dir=/mnt/diag')).toBe(
      '/mnt/diag'
    );
  });

  it('reads a value given as the next argument', () => {
    expect(resolveDiagnosticDir(['--diagnostic-dir', '/a', '--inspect'], '')).toBe('/a');
    expect(resolveDiagnosticDir([], '--diagnostic-dir /mnt/diag --inspect')).toBe('/mnt/diag');
  });

  it("reads the quoted directory Kibana's start script sets", () => {
    expect(
      resolveDiagnosticDir(
        [],
        '--heapsnapshot-signal=SIGUSR2 --diagnostic-dir="/usr/share/kibana/data"'
      )
    ).toBe('/usr/share/kibana/data');
  });

  it('reads a quoted directory with spaces and escaped characters', () => {
    expect(resolveDiagnosticDir([], '--diagnostic-dir="/opt/my kibana/data" --inspect')).toBe(
      '/opt/my kibana/data'
    );
    expect(resolveDiagnosticDir([], '--diagnostic-dir="/opt/a\\"b"')).toBe('/opt/a"b');
  });

  it('ignores extra spaces between options', () => {
    expect(resolveDiagnosticDir([], '  --inspect   --diagnostic-dir=/a  ')).toBe('/a');
  });

  it('returns undefined without --diagnostic-dir', () => {
    expect(resolveDiagnosticDir(['--inspect'], '--max-old-space-size=1')).toBeUndefined();
    expect(resolveDiagnosticDir([], '')).toBeUndefined();
  });

  it('returns undefined when the last --diagnostic-dir is empty', () => {
    expect(resolveDiagnosticDir(['--diagnostic-dir='], '--diagnostic-dir=/env')).toBeUndefined();
  });

  it('returns undefined when --diagnostic-dir is last and has no value', () => {
    expect(resolveDiagnosticDir(['--inspect', '--diagnostic-dir'], '')).toBeUndefined();
    expect(resolveDiagnosticDir([], '--diagnostic-dir')).toBeUndefined();
  });

  it('uses the last --diagnostic-dir', () => {
    expect(
      resolveDiagnosticDir(
        [],
        '--heapsnapshot-signal=SIGUSR2 --diagnostic-dir="/usr/share/kibana/data" --diagnostic-dir=/mnt/diagnostics'
      )
    ).toBe('/mnt/diagnostics');
  });

  it('prefers command-line flags over NODE_OPTIONS', () => {
    expect(resolveDiagnosticDir(['--diagnostic-dir=/cli'], '--diagnostic-dir=/env')).toBe('/cli');
  });

  it('uses a later --diagnostic_dir over an earlier --diagnostic-dir', () => {
    expect(
      resolveDiagnosticDir(['--diagnostic-dir=/default', '--diagnostic_dir=/override'], '')
    ).toBe('/override');
  });

  it('uses a later --diagnostic-dir over an earlier --diagnostic_dir', () => {
    expect(
      resolveDiagnosticDir(['--diagnostic_dir=/override', '--diagnostic-dir=/default'], '')
    ).toBe('/default');
  });

  it('reads a --diagnostic_dir value given as the next argument', () => {
    expect(resolveDiagnosticDir(['--diagnostic_dir', '/override', '--inspect'], '')).toBe(
      '/override'
    );
  });

  it('keeps underscores in the directory', () => {
    expect(resolveDiagnosticDir(['--diagnostic_dir=/opt/my_dir'], '')).toBe('/opt/my_dir');
    expect(resolveDiagnosticDir(['--diagnostic-dir=/opt/my_dir'], '')).toBe('/opt/my_dir');
  });

  it('prefers command-line flags over NODE_OPTIONS of the other spelling', () => {
    expect(resolveDiagnosticDir(['--diagnostic_dir=/cli'], '--diagnostic-dir=/env')).toBe('/cli');
    expect(resolveDiagnosticDir(['--diagnostic-dir=/cli'], '--diagnostic_dir=/env')).toBe('/cli');
  });

  it('returns undefined when the last --diagnostic_dir is empty', () => {
    expect(resolveDiagnosticDir(['--diagnostic_dir='], '--diagnostic-dir=/env')).toBeUndefined();
  });

  it('ignores --diagnostic_directory', () => {
    expect(resolveDiagnosticDir(['--diagnostic_directory=/no'], '')).toBeUndefined();
  });
});
