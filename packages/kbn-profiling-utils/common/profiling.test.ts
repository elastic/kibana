/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createStackFrameMetadata,
  FrameSymbolStatus,
  FrameType,
  getCalleeFunction,
  getCalleeLabel,
  getCalleeSource,
  getFrameSymbolStatus,
  getLanguageType,
  normalizeFrameType,
  StackFrameMetadata,
} from './profiling';

describe('Stack frame metadata operations', () => {
  test('metadata has executable and function names', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'chrome',
      FrameType: FrameType.Native,
      FunctionName: 'strlen()',
    });
    expect(getCalleeFunction(metadata)).toEqual('chrome: strlen()');
  });

  test('metadata only has executable name', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'promtail',
      FrameType: FrameType.Native,
    });
    expect(getCalleeFunction(metadata)).toEqual('promtail');
  });

  test('metadata has executable name but no function name or source line', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'promtail',
      FrameType: FrameType.Native,
    });
    expect(getCalleeSource(metadata)).toEqual('promtail+0x0');
  });

  test('metadata has no executable name, function name, or source line', () => {
    const metadata = createStackFrameMetadata({});
    expect(getCalleeSource(metadata)).toEqual('<unsymbolized>');
  });

  test('metadata has source name but no source line', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'dockerd',
      FrameType: FrameType.Native,
      SourceFilename: 'dockerd',
      FunctionOffset: 0x183a5b0,
    });
    expect(getCalleeSource(metadata)).toEqual('dockerd');
  });

  test('metadata has source name and function offset', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'python3.9',
      FrameType: FrameType.Python,
      FunctionName: 'PyDict_GetItemWithError',
      FunctionOffset: 2567,
      SourceFilename: '/build/python3.9-RNBry6/python3.9-3.9.2/Objects/dictobject.c',
      SourceLine: 1456,
    });
    expect(getCalleeSource(metadata)).toEqual(
      '/build/python3.9-RNBry6/python3.9-3.9.2/Objects/dictobject.c#1456'
    );
  });

  test('metadata has source name but no function offset', () => {
    const metadata = createStackFrameMetadata({
      ExeFileName: 'agent',
      FrameType: FrameType.Native,
      FunctionName: 'runtime.mallocgc',
      SourceFilename: 'runtime/malloc.go',
    });
    expect(getCalleeSource(metadata)).toEqual('runtime/malloc.go');
  });
});

describe('getFrameSymbolStatus', () => {
  it('returns partially symbolized when metadata has executable name but no source name and source line', () => {
    expect(getFrameSymbolStatus({ sourceFilename: '', sourceLine: 0, exeFileName: 'foo' })).toEqual(
      FrameSymbolStatus.PARTIALLY_SYMBOLYZED
    );
  });
  it('returns not symbolized when metadata has no source name and source line and executable name', () => {
    expect(getFrameSymbolStatus({ sourceFilename: '', sourceLine: 0 })).toEqual(
      FrameSymbolStatus.NOT_SYMBOLIZED
    );
  });

  it('returns symbolized when metadata has source name and source line', () => {
    expect(getFrameSymbolStatus({ sourceFilename: 'foo', sourceLine: 10 })).toEqual(
      FrameSymbolStatus.SYMBOLIZED
    );
  });
});

describe('normalizeFrameType', () => {
  it('rewrites any frame with error bit to the generic error variant', () => {
    expect(normalizeFrameType(0x83 as FrameType)).toEqual(FrameType.Error);
  });
  it('rewrites unknown frame types to "unsymbolized" variant', () => {
    expect(normalizeFrameType(0x123 as FrameType)).toEqual(FrameType.Unsymbolized);
  });
  it('passes regular known frame types through untouched', () => {
    expect(normalizeFrameType(FrameType.JVM)).toEqual(FrameType.JVM);
    expect(normalizeFrameType(FrameType.Native)).toEqual(FrameType.Native);
    expect(normalizeFrameType(FrameType.JavaScript)).toEqual(FrameType.JavaScript);
  });
});

describe('getLanguageType', () => {
  [FrameType.Native, FrameType.Kernel].map((type) =>
    it(`returns native for ${type}`, () => {
      expect(getLanguageType({ frameType: type })).toEqual('NATIVE');
    })
  );
  [
    FrameType.JVM,
    FrameType.JavaScript,
    FrameType.PHP,
    FrameType.PHPJIT,
    FrameType.Perl,
    FrameType.Python,
    FrameType.Ruby,
    FrameType.DotNET,
  ].map((type) =>
    it(`returns interpreted for ${type}`, () => {
      expect(getLanguageType({ frameType: type })).toEqual('INTERPRETED');
    })
  );
});

describe('getCalleeLabel', () => {
  it('returns error message for FrameType.Error', () => {
    const metadata: StackFrameMetadata = {
      FrameID: '1',
      FileID: 'file1',
      FrameType: FrameType.Error,
      Inline: false,
      AddressOrLine: 404,
      FunctionName: '',
      FunctionOffset: 0,
      SourceFilename: '',
      SourceLine: 0,
      ExeFileName: 'app.exe',
    };

    expect(getCalleeLabel(metadata)).toEqual('Error: unwinding error code #404');
  });

  it('returns label with inline indicator if Inline is true', () => {
    const metadata: StackFrameMetadata = {
      FrameID: '2',
      FileID: 'file2',
      FrameType: FrameType.Native,
      Inline: true,
      AddressOrLine: 123,
      FunctionName: 'someFunction',
      FunctionOffset: 0,
      SourceFilename: 'path/to/file.ts',
      SourceLine: 5,
      ExeFileName: 'app.exe',
    };

    expect(getCalleeLabel(metadata)).toEqual('-> app.exe: someFunction() in file.ts#5');
  });

  it('returns label without function name if FunctionName is empty', () => {
    const metadata: StackFrameMetadata = {
      FrameID: '3',
      FileID: 'file3',
      FrameType: FrameType.Native,
      Inline: false,
      AddressOrLine: 456,
      FunctionName: '',
      FunctionOffset: 0,
      SourceFilename: 'path/to/file.ts',
      SourceLine: 0,
      ExeFileName: 'app.exe',
    };

    expect(getCalleeLabel(metadata)).toEqual('app.exe');
  });

  it('returns label without line number if SourceLine is 0', () => {
    const metadata: StackFrameMetadata = {
      FrameID: '4',
      FileID: 'file4',
      FrameType: FrameType.Native,
      Inline: false,
      AddressOrLine: 789,
      FunctionName: 'someFunction',
      FunctionOffset: 0,
      SourceFilename: 'path/to/file.ts',
      SourceLine: 0,
      ExeFileName: 'app.exe',
    };

    expect(getCalleeLabel(metadata)).toEqual('app.exe: someFunction() in file.ts');
  });

  it('returns label with function name and line number', () => {
    const metadata: StackFrameMetadata = {
      FrameID: '5',
      FileID: 'file5',
      FrameType: FrameType.Native,
      Inline: false,
      AddressOrLine: 101112,
      FunctionName: 'someFunction',
      FunctionOffset: 0,
      SourceFilename: 'path/to/file.ts',
      SourceLine: 10,
      ExeFileName: 'app.exe',
    };

    expect(getCalleeLabel(metadata)).toEqual('app.exe: someFunction() in file.ts#10');
  });

  it('returns label without function name', () => {
    const metadata: StackFrameMetadata = {
      FrameID: '5',
      FileID: 'file5',
      FrameType: FrameType.Native,
      Inline: false,
      AddressOrLine: 101112,
      FunctionName: 'someFunction',
      FunctionOffset: 0,
      SourceFilename: '',
      SourceLine: 10,
      ExeFileName: 'app.exe',
    };

    expect(getCalleeLabel(metadata)).toEqual('app.exe: someFunction()');
  });
});
