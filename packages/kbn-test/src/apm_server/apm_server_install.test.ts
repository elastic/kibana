/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';

import { ApmServerInstall } from './apm_server_install';
import { ArchiveArtifact } from './archive_artifact';
import { MAC_PLATFORM } from './platforms';

jest.mock('@kbn/dev-utils/target/extract.js');
const { extract } = jest.requireMock('@kbn/dev-utils/target/extract.js');

jest.mock('fs/promises');
const Fs = jest.requireMock('fs/promises');

jest.mock('execa');
const execa = jest.requireMock('execa');

class MockApmServerProc extends EventEmitter {
  private static implementations: Array<(proc: MockApmServerProc) => void> = [];

  static nextImplementation(fn: (proc: MockApmServerProc) => void) {
    MockApmServerProc.implementations.push(fn);
  }

  stdout = new EventEmitter();
  stderr = new EventEmitter();

  constructor() {
    super();

    const implementation = MockApmServerProc.implementations.shift();
    setTimeout(() => {
      if (implementation) {
        implementation(this);
      } else {
        this.mockExit(0);
      }
    }, 1);
  }

  mockEcsLogLine(level: 'info' | 'debug' | 'error', message: string) {
    this.stdout.emit(
      'data',
      `${JSON.stringify({
        'service.name': 'apm-server',
        'log.logger': 'mock',
        'log.level': level,
        message,
      })}\n`
    );
  }

  mockPlainTextLogLine(message: string) {
    this.stdout.emit('data', `${message}\n`);
  }

  mockExit(statusCode: number | { signal: string }) {
    if (typeof statusCode === 'number') {
      this.emit('exit', statusCode, null);
    } else {
      this.emit('exit', null, statusCode.signal);
    }
    this.stdout.emit('end');
    this.stderr.emit('end');
  }
}

execa.mockImplementation(() => new MockApmServerProc());

const {
  ToolingLog,
  ToolingLogCollectingWriter,
  createAbsolutePathSerializer,
  createStripAnsiSerializer,
} = jest.requireActual('@kbn/dev-utils');

const logCollector = new ToolingLogCollectingWriter();
const log = new ToolingLog();
log.setWriters([logCollector]);

const archive = new ArchiveArtifact(log, MAC_PLATFORM, '/artifacts/bar.tar.gz');
const node = new ApmServerInstall(log, 'foo', archive);

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createStripAnsiSerializer());

beforeEach(() => {
  logCollector.messages.length = 0;
  jest.clearAllMocks();
});

describe('#extract()', () => {
  it('deletes the previous install and extracts the archivePath to the installDir, stripping a single component', async () => {
    await node.extract();

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " debg deleting previous install",
        " debg installing APM server from archive",
      ]
    `);
    expect(Fs.rm.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <absolute path>/data/test-apm-server/installs/foo,
          Object {
            "force": true,
            "recursive": true,
          },
        ],
      ]
    `);
    expect(extract.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "archivePath": "/artifacts/bar.tar.gz",
            "stripComponents": 1,
            "targetDir": <absolute path>/data/test-apm-server/installs/foo,
          },
        ],
      ]
    `);
  });
});

describe('#configureInstall()', () => {
  it('writes the config values to the config file', async () => {
    await node.configureInstall({
      port: 48484,
      elasticsearch: {
        hosts: ['foo'],
        password: 'pass',
        username: 'someuser',
      },
    });

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " debg writing apm-server.yml",
      ]
    `);
    expect(Fs.writeFile.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <absolute path>/data/test-apm-server/installs/foo/apm-server.yml,
          "apm-server:
        host: 'localhost:48484'
        rum:
          enabled: true
          event_rate:
            limit: 1000
          allow_origins:
            - '*'
      output:
        elasticsearch:
          hosts:
            - foo
          password: pass
          username: someuser
      ",
        ],
      ]
    `);
  });

  it('writes defaults when config not provided', async () => {
    await node.configureInstall();

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " debg writing apm-server.yml",
      ]
    `);
    expect(Fs.writeFile.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <absolute path>/data/test-apm-server/installs/foo/apm-server.yml,
          "apm-server:
        rum:
          enabled: true
          event_rate:
            limit: 1000
          allow_origins:
            - '*'
      output:
        elasticsearch:
          hosts:
            - 'localhost:9200'
          username: elastic
          password: changeme
      ",
        ],
      ]
    `);
  });
});

describe('#run()', () => {
  it('runs apm-server with expected args/cwd and rejects if process unexpectedly exits', async () => {
    await expect(() => node.run()).rejects.toMatchInlineSnapshot(
      `[Error: apm-server unexpectedly exitted with code [0]]`
    );

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " info apm-server exitted with code 0",
      ]
    `);

    expect(execa).toHaveBeenCalledTimes(1);
    expect(execa.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "./apm-server",
        Array [
          "-e",
          "run",
        ],
        Object {
          "cwd": <absolute path>/data/test-apm-server/installs/foo,
          "extendEnv": false,
          "stdio": Array [
            "ignore",
            "pipe",
            "pipe",
          ],
        },
      ]
    `);
  });

  it('logs output written by the apm-server with expected log levels, writes everything else as debug', async () => {
    MockApmServerProc.nextImplementation((proc) => {
      proc.mockEcsLogLine('info', 'progress info');
      proc.mockEcsLogLine('error', 'SOMETHING went wrong!');
      proc.mockEcsLogLine('debug', 'something that might be helpful for debugging');
      proc.mockPlainTextLogLine(`plain-text log line`);
      proc.mockExit(0);
    });

    await expect(() => node.run()).rejects.toMatchInlineSnapshot(
      `[Error: apm-server unexpectedly exitted with code [0]]`
    );

    expect(logCollector.messages).toMatchInlineSnapshot(`
      Array [
        " info [foo] [mock] progress info",
        "ERROR [foo] [mock] SOMETHING went wrong!",
        " debg [foo] [mock] something that might be helpful for debugging",
        " info [foo] plain-text log line",
        " info apm-server exitted with code 0",
      ]
    `);
  });
});
