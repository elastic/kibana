/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  createFrameGroup,
  createStackFrameMetadata,
  compareFrameGroup,
  defaultGroupBy,
  hashFrameGroup,
} from './profiling';

describe('Frame group operations', () => {
  test('check if a frame group is less than another', () => {
    const a = createFrameGroup({ ExeFileName: 'chrome' });
    const b = createFrameGroup({ ExeFileName: 'dockerd' });
    expect(compareFrameGroup(a, b)).toEqual(-1);
  });

  test('check if a frame group is greater than another', () => {
    const a = createFrameGroup({ ExeFileName: 'oom_reaper' });
    const b = createFrameGroup({ ExeFileName: 'dockerd' });
    expect(compareFrameGroup(a, b)).toEqual(1);
  });

  test('check if frame groups are equal', () => {
    const a = createFrameGroup({ AddressOrLine: 1234 });
    const b = createFrameGroup({ AddressOrLine: 1234 });
    expect(compareFrameGroup(a, b)).toEqual(0);
  });

  test('check serialized non-symbolized frame', () => {
    const metadata = createStackFrameMetadata({
      FileID: '0x0123456789ABCDEF',
      AddressOrLine: 102938,
    });
    expect(hashFrameGroup(defaultGroupBy(metadata))).toEqual(
      '{"FileID":"0x0123456789ABCDEF","ExeFileName":"","FunctionName":"","AddressOrLine":102938,"SourceFilename":""}'
    );
  });

  test('check serialized non-symbolized ELF frame', () => {
    const metadata = createStackFrameMetadata({
      FunctionName: 'strlen()',
      FileID: '0x0123456789ABCDEF',
    });
    expect(hashFrameGroup(defaultGroupBy(metadata))).toEqual(
      '{"FileID":"0x0123456789ABCDEF","ExeFileName":"","FunctionName":"strlen()","AddressOrLine":0,"SourceFilename":""}'
    );
  });

  test('check serialized symbolized frame', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'chrome',
      SourceFilename: 'strlen()',
      FunctionName: 'strlen()',
    });
    expect(hashFrameGroup(defaultGroupBy(metadata))).toEqual(
      '{"FileID":"","ExeFileName":"chrome","FunctionName":"strlen()","AddressOrLine":0,"SourceFilename":"strlen()"}'
    );
  });
});
