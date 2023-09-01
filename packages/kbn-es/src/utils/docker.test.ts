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
  detectRunningNodes,
  maybeCreateDockerNetwork,
  maybePullDockerImage,
  resolveDockerCmd,
  resolveDockerImage,
  resolveEsArgs,
  resolvePort,
  runDockerContainer,
  runServerlessCluster,
  runServerlessEsNode,
  SERVERLESS_IMG,
  setupServerlessVolumes,
  stopServerlessCluster,
  teardownServerlessClusterSync,
  verifyDockerInstalled,
} from './docker';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';
import { ES_P12_PATH } from '@kbn/dev-utils';
import { ESS_RESOURCES_PATHS } from '../paths';

jest.mock('execa');
const execa = jest.requireMock('execa');
jest.mock('@elastic/elasticsearch', () => {
  return {
    Client: jest.fn(),
  };
});

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
  expect((await stat(serverlessObjectStorePath)).mode & 0o777).toBe(0o777);
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

describe('resolvePort()', () => {
  test('should return default port when no options', () => {
    const port = resolvePort({});

    expect(port).toMatchInlineSnapshot(`
      Array [
        "-p",
        "127.0.0.1:9200:9200",
      ]
    `);
  });

  test('should return custom port when passed in options', () => {
    const port = resolvePort({ port: 9220 });

    expect(port).toMatchInlineSnapshot(`
      Array [
        "-p",
        "127.0.0.1:9220:9220",
        "--env",
        "http.port=9220",
      ]
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

describe('maybePullDockerImage()', () => {
  test('should pull the passed image', async () => {
    execa.mockImplementationOnce(() => Promise.resolve({ exitCode: 0 }));

    await maybePullDockerImage(log, DOCKER_IMG);

    expect(execa.mock.calls[0][0]).toEqual('docker');
    expect(execa.mock.calls[0][1]).toEqual(expect.arrayContaining(['pull', DOCKER_IMG]));
  });
});

describe('detectRunningNodes()', () => {
  const nodes = ['es01', 'es02', 'es03'];

  test('should not error if no nodes detected', async () => {
    execa.mockImplementationOnce(() => Promise.resolve({ stdout: '' }));

    await detectRunningNodes(log, {});

    expect(execa.mock.calls).toHaveLength(1);
    expect(execa.mock.calls[0][1]).toEqual(expect.arrayContaining(['ps', '--quiet', '--filter']));
  });

  test('should kill nodes if detected and kill passed', async () => {
    execa.mockImplementationOnce(() =>
      Promise.resolve({
        stdout: nodes.join('\n'),
      })
    );

    await detectRunningNodes(log, { kill: true });

    expect(execa.mock.calls).toHaveLength(2);
    expect(execa.mock.calls[1][1]).toEqual(expect.arrayContaining(nodes.concat('kill')));
  });

  test('should error if nodes detected and kill not passed', async () => {
    execa.mockImplementationOnce(() =>
      Promise.resolve({
        stdout: nodes.join('\n'),
      })
    );

    await expect(detectRunningNodes(log, {})).rejects.toThrowErrorMatchingInlineSnapshot(
      `"ES has already been started, pass --kill to automatically stop the nodes on startup."`
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

  test('should add SSL args and enable security when SSL is passed', () => {
    const esArgs = resolveEsArgs([...defaultEsArgs, ['xpack.security.enabled', 'false']], {
      ssl: true,
    });

    expect(esArgs).toHaveLength(20);
    expect(esArgs).not.toEqual(expect.arrayContaining(['xpack.security.enabled=false']));
    expect(esArgs).toMatchInlineSnapshot(`
      Array [
        "--env",
        "foo=bar",
        "--env",
        "qux=zip",
        "--env",
        "xpack.security.enabled=true",
        "--env",
        "xpack.security.http.ssl.enabled=true",
        "--env",
        "xpack.security.http.ssl.keystore.path=/usr/share/elasticsearch/config/certs/elasticsearch.p12",
        "--env",
        "xpack.security.http.ssl.verification_mode=certificate",
        "--env",
        "xpack.security.transport.ssl.enabled=true",
        "--env",
        "xpack.security.transport.ssl.keystore.path=/usr/share/elasticsearch/config/certs/elasticsearch.p12",
        "--env",
        "xpack.security.transport.ssl.verification_mode=certificate",
        "--env",
        "xpack.security.operator_privileges.enabled=true",
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

  test('should add SSL volumes when ssl is passed', async () => {
    mockFs(existingObjectStore);

    const volumeCmd = await setupServerlessVolumes(log, { basePath: baseEsPath, ssl: true });

    const requiredPaths = [`${baseEsPath}:/objectstore:z`, ES_P12_PATH, ...ESS_RESOURCES_PATHS];
    const pathsNotIncludedInCmd = requiredPaths.filter(
      (path) => !volumeCmd.some((cmd) => cmd.includes(path))
    );

    expect(volumeCmd).toHaveLength(20);
    expect(pathsNotIncludedInCmd).toEqual([]);
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

    // setupDocker execa calls then run three nodes and attach logger
    expect(execa.mock.calls).toHaveLength(8);
  });
  describe('waitForReady', () => {
    test('should wait for serverless nodes to be ready to serve requests', async () => {
      mockFs({
        [baseEsPath]: {},
      });
      execa.mockImplementation(() => Promise.resolve({ stdout: '' }));
      const info = jest.fn();
      jest.requireMock('@elastic/elasticsearch').Client.mockImplementation(() => ({ info }));

      info.mockImplementationOnce(() => Promise.reject()); // first call fails
      info.mockImplementationOnce(() => Promise.resolve()); // then succeeds

      await runServerlessCluster(log, { basePath: baseEsPath, waitForReady: true });
      expect(info).toHaveBeenCalledTimes(2);
    });
  });
});

describe('stopServerlessCluster()', () => {
  test('should stop passed in nodes', async () => {
    const nodes = ['es01', 'es02', 'es03'];
    execa.mockImplementation(() => Promise.resolve({ stdout: '' }));

    await stopServerlessCluster(log, nodes);

    expect(execa.mock.calls[0][0]).toEqual('docker');
    expect(execa.mock.calls[0][1]).toEqual(
      expect.arrayContaining(['container', 'stop'].concat(nodes))
    );
  });
});

describe('teardownServerlessClusterSync()', () => {
  const defaultOptions = { basePath: 'foo/bar' };

  test('should kill running serverless nodes', () => {
    const nodes = ['es01', 'es02', 'es03'];
    execa.commandSync.mockImplementation(() => ({
      stdout: nodes.join('\n'),
    }));

    teardownServerlessClusterSync(log, defaultOptions);

    expect(execa.commandSync.mock.calls).toHaveLength(2);
    expect(execa.commandSync.mock.calls[0][0]).toEqual(expect.stringContaining(SERVERLESS_IMG));
    expect(execa.commandSync.mock.calls[1][0]).toEqual(`docker kill ${nodes.join(' ')}`);
  });

  test('should not kill if no serverless nodes', () => {
    execa.commandSync.mockImplementation(() => ({
      stdout: '\n',
    }));

    teardownServerlessClusterSync(log, defaultOptions);

    expect(execa.commandSync.mock.calls).toHaveLength(1);
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
    // setupDocker execa calls then run container
    expect(execa.mock.calls).toHaveLength(5);
  });
});
