/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import mockFs from 'mock-fs';

import { existsSync } from 'fs';
import { stat } from 'fs/promises';

import {
  DOCKER_IMG,
  maybeCreateDockerNetwork,
  resolveDockerCmd,
  resolveDockerImage,
  resolveEsArgs,
  runDockerContainer,
  runServerlessCluster,
  runServerlessEsNode,
  SERVERLESS_IMG,
  setupServerlessVolumes,
  verifyDockerInstalled,
} from './docker';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

jest.mock('execa');
const execa = jest.requireMock('execa');

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

const KIBANA_ROOT = process.cwd();
const baseEsPath = `${KIBANA_ROOT}/.es`;
const serverlessDir = 'stateless';
const serverlessObjectStorePath = `${baseEsPath}/${serverlessDir}`;

beforeEach(() => {
  jest.resetAllMocks();
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;

  // jest relies on the filesystem to get sourcemaps when using console.log
  // which breaks with the mocked FS, see https://github.com/tschaub/mock-fs/issues/234
  // hijacking logging to process.stdout as a workaround for this suite.
  jest.spyOn(console, 'log').mockImplementation((...args) => {
    process.stdout.write(args + '\n');
  });
});

afterEach(() => {
  mockFs.restore();
  // restore the console.log behavior
  jest.clearAllMocks();
});

const volumeCmdTest = async (volumeCmd: string[]) => {
  expect(volumeCmd).toHaveLength(2);
  expect(volumeCmd).toEqual(expect.arrayContaining(['--volume', `${baseEsPath}:/objectstore:z`]));

  // extract only permission from mode
  // eslint-disable-next-line no-bitwise
  expect((await stat(serverlessObjectStorePath)).mode & 0o777).toBe(0o766);
};

describe('resolveDockerImage()', () => {
  const defaultRepo = 'another/repo';
  const defaultImg = 'default/reg/repo:tag';
  const tag = '8.8.2';

  test('should return default image when no options', () => {
    const image = resolveDockerImage({ repo: defaultRepo, defaultImg });

    expect(image).toEqual(defaultImg);
  });

  test('should return tag with default repo when tag is passed', () => {
    const image = resolveDockerImage({ repo: defaultRepo, tag, defaultImg });

    expect(image).toMatchInlineSnapshot(`"another/repo:8.8.2"`);
  });

  test('should return image when tag is also passed', () => {
    const image = resolveDockerImage({ repo: defaultRepo, tag, image: DOCKER_IMG, defaultImg });

    expect(image).toEqual(DOCKER_IMG);
  });

  test('should error when invalid registry is passed', () => {
    expect(() =>
      resolveDockerImage({
        repo: defaultRepo,
        tag,
        image: 'another.registry.co/es/es:latest',
        defaultImg,
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      "Only verified images from docker.elastic.co are currently allowed.
      If you require this functionality in @kbn/es please contact the Kibana Operations Team."
    `);
  });
});

describe('verifyDockerInstalled()', () => {
  test('should call the correct Docker command and log the version', async () => {
    execa.mockImplementationOnce(() => Promise.resolve({ stdout: 'Docker Version 123' }));

    await verifyDockerInstalled(log);

    expect(execa.mock.calls).toMatchInlineSnapshot(`
          Array [
            Array [
              "docker",
              Array [
                "--version",
              ],
            ],
          ]
      `);

    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m [1mVerifying Docker is installed.[22m",
        "   │ [34minfo[39m Docker Version 123",
      ]
    `);
  });

  test('should reject when Docker is not installed', async () => {
    execa.mockImplementationOnce(() => Promise.reject({ message: 'Hello World' }));

    await expect(verifyDockerInstalled(log)).rejects.toThrowErrorMatchingInlineSnapshot(`
      "Docker not found locally. Install it from: https://www.docker.com

      Hello World"
    `);
  });
});

describe('maybeCreateDockerNetwork()', () => {
  test('should call the correct Docker command and create the network if needed', async () => {
    execa.mockImplementationOnce(() => Promise.resolve({ exitCode: 0 }));

    await maybeCreateDockerNetwork(log);

    expect(execa.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          "docker",
          Array [
            "network",
            "create",
            "elastic",
          ],
        ],
      ]
    `);

    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m [1mChecking status of elastic Docker network.[22m",
        "   │ [34minfo[39m Created new network.",
      ]
    `);
  });

  test('should use an existing network', async () => {
    execa.mockImplementationOnce(() =>
      Promise.reject({ message: 'network with name elastic already exists' })
    );

    await maybeCreateDockerNetwork(log);

    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m [1mChecking status of elastic Docker network.[22m",
        "   │ [34minfo[39m Using existing network.",
      ]
    `);
  });

  test('should reject for any other Docker error', async () => {
    execa.mockImplementationOnce(() => Promise.reject({ message: 'some error' }));

    await expect(maybeCreateDockerNetwork(log)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"some error"`
    );
  });
});

describe('resolveEsArgs()', () => {
  const defaultEsArgs: Array<[string, string]> = [
    ['foo', 'bar'],
    ['qux', 'zip'],
  ];

  test('should return default args when no options', () => {
    const esArgs = resolveEsArgs(defaultEsArgs, {});

    expect(esArgs).toHaveLength(4);
    expect(esArgs).toMatchInlineSnapshot(`
      Array [
        "--env",
        "foo=bar",
        "--env",
        "qux=zip",
      ]
    `);
  });

  test('should override default args when options is a string', () => {
    const esArgs = resolveEsArgs(defaultEsArgs, { esArgs: 'foo=true' });

    expect(esArgs).toHaveLength(4);
    expect(esArgs).toMatchInlineSnapshot(`
      Array [
        "--env",
        "foo=true",
        "--env",
        "qux=zip",
      ]
    `);
  });

  test('should override default args when options is an array', () => {
    const esArgs = resolveEsArgs(defaultEsArgs, { esArgs: ['foo=false', 'qux=true'] });

    expect(esArgs).toHaveLength(4);
    expect(esArgs).toMatchInlineSnapshot(`
      Array [
        "--env",
        "foo=false",
        "--env",
        "qux=true",
      ]
    `);
  });

  test('should override defaults args and handle password option', () => {
    const esArgs = resolveEsArgs(defaultEsArgs, { esArgs: 'foo=false', password: 'hello' });

    expect(esArgs).toHaveLength(6);
    expect(esArgs).toMatchInlineSnapshot(`
      Array [
        "--env",
        "foo=false",
        "--env",
        "qux=zip",
        "--env",
        "ELASTIC_PASSWORD=hello",
      ]
    `);
  });
});

describe('setupServerlessVolumes()', () => {
  const existingObjectStore = {
    [baseEsPath]: {
      [serverlessDir]: {
        cluster_state: { 0: {}, 1: {}, lease: 'hello world' },
      },
    },
  };

  test('should create stateless directory and return volume docker command', async () => {
    mockFs({
      [baseEsPath]: {},
    });

    const volumeCmd = await setupServerlessVolumes(log, { basePath: baseEsPath });

    volumeCmdTest(volumeCmd);
    expect(existsSync(serverlessObjectStorePath)).toBe(true);
  });

  test('should use an existing object store', async () => {
    mockFs(existingObjectStore);

    const volumeCmd = await setupServerlessVolumes(log, { basePath: baseEsPath });

    volumeCmdTest(volumeCmd);
    expect(existsSync(`${serverlessObjectStorePath}/cluster_state/lease`)).toBe(true);
  });

  test('should remove an existing object store when clean is passed', async () => {
    mockFs(existingObjectStore);

    const volumeCmd = await setupServerlessVolumes(log, { basePath: baseEsPath, clean: true });

    volumeCmdTest(volumeCmd);
    expect(existsSync(`${serverlessObjectStorePath}/cluster_state/lease`)).toBe(false);
  });
});

describe('runServerlessEsNode()', () => {
  const node = {
    params: ['--env', 'foo=bar', '--volume', 'foo/bar'],
    name: 'es01',
    image: SERVERLESS_IMG,
  };

  test('should call the correct Docker command', async () => {
    execa.mockImplementationOnce(() => Promise.resolve({ stdout: 'containerId1234' }));

    await runServerlessEsNode(log, node);

    expect(execa.mock.calls[0][0]).toEqual('docker');
    expect(execa.mock.calls[0][1]).toEqual(
      expect.arrayContaining([
        SERVERLESS_IMG,
        ...node.params,
        '--name',
        node.name,
        '--env',
        `node.name=${node.name}`,
        'run',
        '--detach',
        '--net',
        'elastic',
      ])
    );
  });
});

describe('runServerlessCluster()', () => {
  test('should start 3 serverless nodes', async () => {
    mockFs({
      [baseEsPath]: {},
    });
    execa.mockImplementation(() => Promise.resolve({ stdout: '' }));

    await runServerlessCluster(log, { basePath: baseEsPath });

    // Verify Docker and network then run three nodes
    expect(execa.mock.calls).toHaveLength(5);
  });
});

describe('resolveDockerCmd()', () => {
  test('should return default command when no options', () => {
    const dockerCmd = resolveDockerCmd({});

    expect(dockerCmd).toEqual(expect.arrayContaining(['run', DOCKER_IMG]));
  });

  test('should return custom command when passed', () => {
    const dockerCmd = resolveDockerCmd({ dockerCmd: 'start -a es01' });

    expect(dockerCmd).toHaveLength(3);
    expect(dockerCmd).toMatchInlineSnapshot(`
      Array [
        "start",
        "-a",
        "es01",
      ]
    `);
  });
});

describe('runDockerContainer()', () => {
  test('should resolve', async () => {
    execa.mockImplementation(() => Promise.resolve({ stdout: '' }));

    await expect(runDockerContainer(log, {})).resolves.toEqual({ stdout: '' });
    // Verify Docker and network then run container
    expect(execa.mock.calls).toHaveLength(3);
  });
});
