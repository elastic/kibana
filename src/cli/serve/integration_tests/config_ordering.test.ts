/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as Fs from 'fs';
import * as Path from 'path';
import * as Os from 'os';
import * as Child from 'child_process';
import Del from 'del';
import * as Rx from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';

const tempDir = Path.join(Os.tmpdir(), 'kbn-config-test');

const kibanaPath = follow('../../../../scripts/kibana.js');

const TIMEOUT_MS = 20000;

const envForTempDir = {
  env: { KBN_PATH_CONF: tempDir },
};

const TestFiles = {
  fileList: [] as string[],

  createEmptyConfigFiles(fileNames: string[], root: string = tempDir): string[] {
    const configFiles = [];
    for (const fileName of fileNames) {
      const filePath = Path.resolve(root, fileName);

      if (!Fs.existsSync(filePath)) {
        Fs.writeFileSync(filePath, 'dummy');

        TestFiles.fileList.push(filePath);
      }

      configFiles.push(filePath);
    }

    return configFiles;
  },
  cleanUpEmptyConfigFiles() {
    for (const filePath of TestFiles.fileList) {
      Del.sync(filePath);
    }
    TestFiles.fileList.length = 0;
  },
};

describe('Server configuration ordering', () => {
  let kibanaProcess: Child.ChildProcessWithoutNullStreams;

  beforeEach(() => {
    Fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (kibanaProcess !== undefined) {
      const exitPromise = new Promise((resolve) => kibanaProcess?.once('exit', resolve));
      kibanaProcess.kill('SIGKILL');
      await exitPromise;
    }

    Del.sync(tempDir, { force: true });
    TestFiles.cleanUpEmptyConfigFiles();
  });

  it('loads default config set without any options', async function () {
    TestFiles.createEmptyConfigFiles(['kibana.yml']);

    kibanaProcess = Child.spawn(process.execPath, [kibanaPath, '--verbose'], envForTempDir);
    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual(['kibana.yml']);
  });

  it('loads serverless configs when --serverless is set', async () => {
    TestFiles.createEmptyConfigFiles([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'serverless.recent.yml',
    ]);

    kibanaProcess = Child.spawn(
      process.execPath,
      [kibanaPath, '--verbose', '--serverless', 'oblt'],
      envForTempDir
    );
    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'serverless.recent.yml',
    ]);
  });

  it('prefers --config options over default', async () => {
    const [configPath] = TestFiles.createEmptyConfigFiles([
      'potato.yml',
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'serverless.recent.yml',
    ]);

    kibanaProcess = Child.spawn(
      process.execPath,
      [kibanaPath, '--verbose', '--serverless', 'oblt', '--config', configPath],
      envForTempDir
    );
    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'potato.yml',
      'serverless.recent.yml',
    ]);
  });

  it('defaults to "es" if --serverless and --dev are there', async () => {
    TestFiles.createEmptyConfigFiles([
      'serverless.yml',
      'serverless.es.yml',
      'kibana.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
    ]);

    kibanaProcess = Child.spawn(
      process.execPath,
      [kibanaPath, '--verbose', '--serverless', '--dev'],
      envForTempDir
    );
    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.es.yml',
      'kibana.yml',
      'serverless.recent.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
    ]);
  });

  it('adds dev configs to the stack', async () => {
    TestFiles.createEmptyConfigFiles([
      'serverless.yml',
      'serverless.security.yml',
      'serverless.recent.yml',
      'kibana.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
    ]);

    kibanaProcess = Child.spawn(
      process.execPath,
      [kibanaPath, '--verbose', '--serverless', 'security', '--dev'],
      envForTempDir
    );

    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.security.yml',
      'kibana.yml',
      'serverless.recent.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
    ]);
  });
});

async function extractConfigurationOrder(
  proc: Child.ChildProcessWithoutNullStreams
): Promise<string[] | undefined> {
  const configMessage = await waitForMessage(proc, /[Cc]onfig.*order:/, TIMEOUT_MS);

  const configList = configMessage
    .match(/order: (.*)$/)
    ?.at(1)
    ?.split(', ')
    ?.map((path) => Path.basename(path));

  return configList;
}

async function waitForMessage(
  proc: Child.ChildProcessWithoutNullStreams,
  expression: string | RegExp,
  timeoutMs: number
): Promise<string> {
  const message$ = Rx.fromEvent(proc.stdout!, 'data').pipe(
    map((messages) => String(messages).split('\n').filter(Boolean))
  );

  const trackedExpression$ = message$.pipe(
    // We know the sighup handler will be registered before this message logged
    filter((messages: string[]) => messages.some((m) => m.match(expression))),
    take(1)
  );

  const error$ = message$.pipe(
    filter((messages: string[]) => messages.some((line) => line.match(/fatal/i))),
    take(1),
    map((line) => new Error(line.join('\n')))
  );

  const value = await Rx.firstValueFrom(
    Rx.race(trackedExpression$, error$).pipe(
      timeout({
        first: timeoutMs,
        with: () =>
          Rx.throwError(
            () => new Error(`Config options didn't appear in logs for ${timeoutMs / 1000}s...`)
          ),
      })
    )
  );

  if (value instanceof Error) {
    throw value;
  }

  if (Array.isArray(value)) {
    return value[0];
  } else {
    return value;
  }
}

function follow(file: string) {
  return Path.relative(process.cwd(), Path.resolve(__dirname, file));
}
