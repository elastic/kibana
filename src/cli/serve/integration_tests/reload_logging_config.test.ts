/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Child from 'child_process';
import Fs from 'fs';
import Path from 'path';
import Os from 'os';
import Del from 'del';

import * as Rx from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { safeDump } from 'js-yaml';
import { getConfigFromFiles } from '@kbn/config';

const configFileLogConsole = follow(
  '__fixtures__/reload_logging_config/kibana_log_console.test.yml'
);
const configFileLogFile = follow('__fixtures__/reload_logging_config/kibana_log_file.test.yml');

const kibanaPath = follow('../../../../scripts/kibana.js');

const second = 1000;
const minute = second * 60;

const tempDir = Path.join(Os.tmpdir(), 'kbn-reload-test');

function follow(file: string) {
  return Path.relative(process.cwd(), Path.resolve(__dirname, file));
}

function watchFileUntil(path: string, matcher: RegExp, timeout: number) {
  return new Promise<string>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      Fs.unwatchFile(path);
      reject(`watchFileUntil timed out for "${matcher}"`);
    }, timeout);

    Fs.watchFile(path, () => {
      try {
        const contents = Fs.readFileSync(path, 'utf-8');

        if (matcher.test(contents)) {
          clearTimeout(timeoutHandle);
          Fs.unwatchFile(path);
          resolve(contents);
        }
      } catch (e) {
        // noop
      }
    });
  });
}

function containsJsonOnly(content: string[]) {
  return content.every((line) => line.startsWith('{'));
}

function createConfigManager(configPath: string) {
  return {
    modify(fn: (input: Record<string, any>) => Record<string, any>) {
      const oldContent = getConfigFromFiles([configPath]);
      const yaml = safeDump(fn(oldContent));
      Fs.writeFileSync(configPath, yaml);
    },
  };
}

// Failing: See https://github.com/elastic/kibana/issues/77279
describe.skip('Server logging configuration', function () {
  let child: undefined | Child.ChildProcess;

  beforeEach(() => {
    Fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(async () => {
    if (child !== undefined) {
      const exitPromise = new Promise((resolve) => child?.once('exit', resolve));
      child.kill('SIGKILL');
      await exitPromise;
    }

    Del.sync(tempDir, { force: true });
  });

  if (process.platform.startsWith('win')) {
    it('SIGHUP is not a feature of Windows.', () => {
      // nothing to do for Windows
    });
    return;
  }

  describe('platform logging', () => {
    it(
      'should be reloadable via SIGHUP process signaling',
      async function () {
        const configFilePath = Path.resolve(tempDir, 'kibana.yml');
        Fs.copyFileSync(configFileLogConsole, configFilePath);

        child = Child.spawn(process.execPath, [kibanaPath, '--oss', '--config', configFilePath]);

        // TypeScript note: As long as the child stdio[1] is 'pipe', then stdout will not be null
        const message$ = Rx.fromEvent(child.stdout!, 'data').pipe(
          map((messages) => String(messages).split('\n').filter(Boolean))
        );

        await message$
          .pipe(
            // We know the sighup handler will be registered before this message logged
            filter((messages: string[]) => messages.some((m) => m.includes('setting up root'))),
            take(1)
          )
          .toPromise();

        const lastMessage = await Rx.firstValueFrom(message$);
        expect(containsJsonOnly(lastMessage)).toBe(true);

        createConfigManager(configFilePath).modify((oldConfig) => {
          oldConfig.logging.appenders.console.layout.kind = 'pattern';
          return oldConfig;
        });
        child.kill('SIGHUP');

        await message$
          .pipe(
            filter((messages) => !containsJsonOnly(messages)),
            take(1)
          )
          .toPromise();
      },
      30 * second
    );
    it(
      'should recreate file handle on SIGHUP',
      async function () {
        const configFilePath = Path.resolve(tempDir, 'kibana.yml');
        Fs.copyFileSync(configFileLogFile, configFilePath);

        const logPath = Path.resolve(tempDir, 'kibana.log');
        const logPathArchived = Path.resolve(tempDir, 'kibana_archive.log');

        createConfigManager(configFilePath).modify((oldConfig) => {
          oldConfig.logging.appenders.file.path = logPath;
          return oldConfig;
        });

        child = Child.spawn(process.execPath, [kibanaPath, '--oss', '--config', configFilePath]);

        await watchFileUntil(logPath, /setting up root/, 30 * second);
        // once the server is running, archive the log file and issue SIGHUP
        Fs.renameSync(logPath, logPathArchived);
        child.kill('SIGHUP');

        await watchFileUntil(logPath, /Reloaded logging configuration due to SIGHUP/, 30 * second);
      },
      minute
    );
  });
});
