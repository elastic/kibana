/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from './monaco_imports';

jest.mock('monaco-editor/internal/common/workers.js', () => ({
  createWebWorker: jest.fn(),
}));

const { createWebWorker: legacyCreateWebWorkerMock } = jest.requireMock(
  'monaco-editor/internal/common/workers.js'
) as { createWebWorker: jest.Mock };

const modernCreateWebWorker = jest.fn();

// register_globals captures monaco.editor.createWebWorker at load time, so the
// modern spy has to be installed before that module is imported.
monaco.editor.createWebWorker = modernCreateWebWorker as typeof monaco.editor.createWebWorker;

beforeAll(async () => {
  await import('./register_globals');
});

describe('registers accompanying objects on window.MonacoEnvironment for kibana', () => {
  it('defines the monaco object on the MonacoEnvironment object', () => {
    expect(window.MonacoEnvironment).toHaveProperty('monaco');
  });

  it('defines the getWorker method on the MonacoEnvironment object', () => {
    expect(window.MonacoEnvironment).toHaveProperty('getWorker', expect.any(Function));
  });
});

describe('monaco augmentation', () => {
  describe('getLanguageThemeResolver', () => {
    it('has the property getLanguageThemeResolver defined', () => {
      expect(monaco.editor).toHaveProperty('getLanguageThemeResolver', expect.any(Function));
    });
  });

  describe('registerLanguageThemeResolver', () => {
    it('has the property registerLanguageThemeResolver defined', () => {
      expect(monaco.editor).toHaveProperty('registerLanguageThemeResolver', expect.any(Function));
    });

    it('registers a theme resolver to a specific ID and returns the same registered theme resolver using the same ID', () => {
      const themeResolver = jest.fn();
      monaco.editor.registerLanguageThemeResolver('test', themeResolver);
      expect(monaco.editor.getLanguageThemeResolver('test')).toBe(themeResolver);
    });

    it('throws an error when attempting to register a different theme resolver if one exists for the specified theme ID', () => {
      expect(() => monaco.editor.registerLanguageThemeResolver('test', jest.fn())).toThrow();
    });

    it('allows registering a different theme resolver for a theme ID with existing resolver definition by specifying the override flag', () => {
      const alternateThemeResolver = jest.fn();
      monaco.editor.registerLanguageThemeResolver('test', alternateThemeResolver, true);
      expect(monaco.editor.getLanguageThemeResolver('test')).toBe(alternateThemeResolver);
    });
  });
});

describe('monaco worker creation shimming', () => {
  const legacyWorker = { kind: 'legacy' };
  const modernWorker = { kind: 'modern' };

  beforeEach(() => {
    legacyCreateWebWorkerMock.mockClear();
    modernCreateWebWorker.mockClear();
    legacyCreateWebWorkerMock.mockReturnValue(legacyWorker);
    modernCreateWebWorker.mockReturnValue(modernWorker);
  });

  it('uses the alternate worker factory when legacy options are provided', () => {
    const options = {
      moduleId: 'vs/language/yaml/yamlWorker',
      label: 'yaml',
      createData: { custom: true },
      host: { ping: () => 'pong' },
      keepIdleModels: true,
    };

    const worker = monaco.editor.createWebWorker(
      options as unknown as monaco.editor.IInternalWebWorkerOptions
    );

    expect(worker).toBe(legacyWorker);
    expect(legacyCreateWebWorkerMock).toHaveBeenCalledTimes(1);
    expect(legacyCreateWebWorkerMock).toHaveBeenCalledWith(options);
    expect(modernCreateWebWorker).not.toHaveBeenCalled();
  });

  it('uses the original worker factory when worker options are provided', () => {
    const options = {
      worker: {} as Worker,
      host: { ping: () => 'pong' },
      keepIdleModels: true,
    };

    const worker = monaco.editor.createWebWorker(options);

    expect(worker).toBe(modernWorker);
    expect(modernCreateWebWorker).toHaveBeenCalledTimes(1);
    expect(modernCreateWebWorker).toHaveBeenCalledWith(options);
    expect(legacyCreateWebWorkerMock).not.toHaveBeenCalled();
  });

  it('uses the original worker factory when options include both moduleId and worker', () => {
    const options = {
      moduleId: 'vs/language/yaml/yamlWorker',
      worker: {} as Worker,
    };

    const worker = monaco.editor.createWebWorker(options);

    expect(worker).toBe(modernWorker);
    expect(modernCreateWebWorker).toHaveBeenCalledTimes(1);
    expect(modernCreateWebWorker).toHaveBeenCalledWith(options);
    expect(legacyCreateWebWorkerMock).not.toHaveBeenCalled();
  });
});
