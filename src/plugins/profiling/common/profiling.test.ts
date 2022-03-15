/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  buildFrameGroup,
  buildStackFrameMetadata,
  compareFrameGroup,
  defaultGroupBy,
} from './profiling';

describe('Frame group operations', () => {
  test('check if a frame group is less than another', () => {
    const a = buildFrameGroup({ ExeFileName: 'chrome' });
    const b = buildFrameGroup({ ExeFileName: 'dockerd' });
    expect(compareFrameGroup(a, b)).toEqual(-1);
  });

  test('check if a frame group is greater than another', () => {
    const a = buildFrameGroup({ ExeFileName: 'oom_reaper' });
    const b = buildFrameGroup({ ExeFileName: 'dockerd' });
    expect(compareFrameGroup(a, b)).toEqual(1);
  });

  test('check if frame groups are equal', () => {
    const a = buildFrameGroup({ AddressOrLine: 1234 });
    const b = buildFrameGroup({ AddressOrLine: 1234 });
    expect(compareFrameGroup(a, b)).toEqual(0);
  });

  test('check serialized non-symbolized frame', () => {
    const metadata = buildStackFrameMetadata({
      FileID: '0x0123456789ABCDEF',
      AddressOrLine: 102938,
    });
    expect(defaultGroupBy(metadata)).toEqual(
      '{"FileID":"0x0123456789ABCDEF","ExeFileName":"","FunctionName":"","AddressOrLine":102938,"SourceFilename":""}'
    );
  });

  test('check serialized non-symbolized ELF frame', () => {
    const metadata = buildStackFrameMetadata({
      FunctionName: 'strlen()',
      FileID: '0x0123456789ABCDEF',
    });
    expect(defaultGroupBy(metadata)).toEqual(
      '{"FileID":"0x0123456789ABCDEF","ExeFileName":"","FunctionName":"strlen()","AddressOrLine":0,"SourceFilename":""}'
    );
  });

  test('check serialized symbolized frame', () => {
    const metadata = buildStackFrameMetadata({
      ExeFileName: 'chrome',
      SourceFilename: 'strlen()',
      FunctionName: 'strlen()',
    });
    expect(defaultGroupBy(metadata)).toEqual(
      '{"FileID":"","ExeFileName":"chrome","FunctionName":"strlen()","AddressOrLine":0,"SourceFilename":"strlen()"}'
    );
  });
});
