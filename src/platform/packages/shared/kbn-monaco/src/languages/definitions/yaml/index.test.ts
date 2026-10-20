/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MonacoYamlOptions } from 'monaco-yaml';
import { monaco } from '../../../monaco_imports';
import { configureMonacoYamlSchema, type CreateWebWorkerOptions } from '.';

jest.mock('monaco-yaml', () => ({
  configureMonacoYaml: jest.fn(),
}));

jest.mock('../../worker_factory', () => ({
  getWorker: jest.fn(),
}));

interface YamlMonacoApi {
  editor: {
    createWebWorker: (
      options: CreateWebWorkerOptions
    ) => ReturnType<typeof monaco.editor.createWebWorker>;
  };
}

const { configureMonacoYaml: configureMonacoYamlMock } = jest.requireMock('monaco-yaml') as {
  configureMonacoYaml: jest.MockedFunction<
    (api: YamlMonacoApi, options: MonacoYamlOptions) => void
  >;
};

const { getWorker: getWorkerMock } = jest.requireMock('../../worker_factory') as {
  getWorker: jest.MockedFunction<(languageId: string) => Worker>;
};

const createWebWorkerMock = jest.fn() as jest.MockedFunction<typeof monaco.editor.createWebWorker>;

const schemas: NonNullable<MonacoYamlOptions['schemas']> = [
  { fileMatch: ['*.yaml'], uri: 'https://example.com/schema.json' },
];

const configureAndGetApi = async (): Promise<YamlMonacoApi> => {
  await configureMonacoYamlSchema(schemas);
  const [api] = configureMonacoYamlMock.mock.calls[0];
  return api;
};

describe('configureMonacoYamlSchema', () => {
  const originalCreateWebWorker = monaco.editor.createWebWorker;

  beforeEach(() => {
    createWebWorkerMock.mockReset();
    createWebWorkerMock.mockReturnValue({
      dispose: () => undefined,
    } as ReturnType<typeof monaco.editor.createWebWorker>);
    getWorkerMock.mockReset();
    getWorkerMock.mockReturnValue({ postMessage: jest.fn() } as unknown as Worker);
    configureMonacoYamlMock.mockClear();
    monaco.editor.createWebWorker = createWebWorkerMock;
  });

  afterEach(() => {
    monaco.editor.createWebWorker = originalCreateWebWorker;
  });

  it('passes a localized createWebWorker and leaves the global one unchanged', async () => {
    const globalCreateWebWorker = monaco.editor.createWebWorker;

    const api = await configureAndGetApi();

    expect(configureMonacoYamlMock).toHaveBeenCalledTimes(1);
    expect(api.editor.createWebWorker).not.toBe(globalCreateWebWorker);
    expect(monaco.editor.createWebWorker).toBe(globalCreateWebWorker);
  });

  it('passes default completion, hover, and validate with the provided schemas', async () => {
    await configureMonacoYamlSchema(schemas);

    const [, options] = configureMonacoYamlMock.mock.calls[0];
    expect(options).toEqual({
      completion: true,
      hover: true,
      validate: true,
      schemas,
    });
  });

  it('lets caller options override defaults while keeping the provided schemas', async () => {
    await configureMonacoYamlSchema(schemas, {
      completion: false,
      hover: false,
      validate: false,
      isKubernetes: true,
    });

    const [, options] = configureMonacoYamlMock.mock.calls[0];
    expect(options).toEqual({
      completion: false,
      hover: false,
      validate: false,
      isKubernetes: true,
      schemas,
    });
  });

  it('translates legacy web worker options into a modern worker handshake', async () => {
    const postMessage = jest.fn();
    const worker = { postMessage } as unknown as Worker;
    getWorkerMock.mockReturnValue(worker);

    const modernWorker = {
      dispose: () => undefined,
    } as ReturnType<typeof monaco.editor.createWebWorker>;
    createWebWorkerMock.mockReturnValue(modernWorker);

    const api = await configureAndGetApi();
    const createData = { schemas };
    const host: monaco.editor.IInternalWebWorkerOptions['host'] = {
      readFile: () => undefined,
    };

    const result = api.editor.createWebWorker({
      moduleId: 'monaco-yaml/yaml.worker',
      label: 'custom-yaml',
      createData,
      host,
      keepIdleModels: true,
    });

    expect(result).toBe(modernWorker);
    expect(getWorkerMock).toHaveBeenCalledWith('custom-yaml');
    expect(createWebWorkerMock).toHaveBeenCalledWith({
      worker: expect.any(Promise),
      host,
      keepIdleModels: true,
    });

    const [passedOptions] = createWebWorkerMock.mock.calls[0];
    await expect(passedOptions.worker).resolves.toBe(worker);
    expect(postMessage).toHaveBeenNthCalledWith(1, 'ignore');
    expect(postMessage).toHaveBeenNthCalledWith(2, createData);
  });

  it('falls back to the yaml language id when legacy options omit a label', async () => {
    const api = await configureAndGetApi();

    api.editor.createWebWorker({
      moduleId: 'monaco-yaml/yaml.worker',
    });

    expect(getWorkerMock).toHaveBeenCalledTimes(1);
    expect(getWorkerMock).toHaveBeenCalledWith('yaml');
  });

  it('passes modern createWebWorker options through unchanged', async () => {
    const api = await configureAndGetApi();
    const modernOptions: monaco.editor.IInternalWebWorkerOptions = {
      worker: Promise.resolve({ postMessage: jest.fn() } as unknown as Worker),
    };

    api.editor.createWebWorker(modernOptions);

    expect(getWorkerMock).not.toHaveBeenCalled();
    expect(createWebWorkerMock).toHaveBeenCalledTimes(1);
    expect(createWebWorkerMock).toHaveBeenCalledWith(modernOptions);
  });

  it('treats options that include both moduleId and worker as modern', async () => {
    const api = await configureAndGetApi();
    const modernOptions = {
      moduleId: 'monaco-yaml/yaml.worker',
      worker: Promise.resolve({ postMessage: jest.fn() } as unknown as Worker),
    } as CreateWebWorkerOptions;

    api.editor.createWebWorker(modernOptions);

    expect(getWorkerMock).not.toHaveBeenCalled();
    expect(createWebWorkerMock).toHaveBeenCalledTimes(1);
    expect(createWebWorkerMock).toHaveBeenCalledWith(modernOptions);
  });
});
