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
const configsPath = follow('../../../../config');

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
    kibanaProcess = Child.spawn(process.execPath, [kibanaPath]);

    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual(['kibana.yml']);
  });

  it('loads serverless configs when --serverless is set', async () => {
    kibanaProcess = Child.spawn(process.execPath, [kibanaPath, '--serverless', 'oblt']);

    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'kibana.yml',
      'serverless.recent.yml',
    ]);
  });

  it('prefers --config options over default', async () => {
    const [configPath] = TestFiles.createEmptyConfigFiles(['potato.yml']);

    kibanaProcess = Child.spawn(process.execPath, [
      kibanaPath,
      '--serverless',
      'oblt',
      '--config',
      configPath,
    ]);

    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.oblt.yml',
      'potato.yml',
      'serverless.recent.yml',
    ]);
  });

  it('adds dev configs to the queue', async () => {
    TestFiles.createEmptyConfigFiles(
      [
        'kibana.dev.yml',
        'serverless.dev.yml',
        // 'serverless.es.dev.yml' // Shouldn't this be loaded? It's mentioned in the README, but wasn't in the code
      ],
      configsPath
    );

    kibanaProcess = Child.spawn(process.execPath, [kibanaPath, '--serverless', 'es', '--dev']);

    const configList = await extractConfigurationOrder(kibanaProcess);

    expect(configList).toEqual([
      'serverless.yml',
      'serverless.es.yml',
      'kibana.yml',
      'serverless.recent.yml',
      'kibana.dev.yml',
      'serverless.dev.yml',
      'serverless.recent.dev.yml',
      // 'serverless.es.dev.yml', // Shouldn't this be loaded? It's mentioned in the README, but wasn't in the code
    ]);
  });
});

async function extractConfigurationOrder(
  proc: Child.ChildProcessWithoutNullStreams
): Promise<string[] | undefined> {
  const configMessage = await waitForMessage(proc, /[Cc]onfig.*order:/, 5000);

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
        with: () => Rx.throwError(() => new Error("Config options didn't appear in logs for 5s")),
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
