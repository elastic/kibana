import { spawn } from 'child_process';
import { resolve } from 'path';
import { format as formatUrl } from 'url';

import { readConfigFile } from '../../lib';
import { createToolingLog, createReduceStream } from '../../../utils';
import { startupEs, startupKibana } from '../lib';

const SCRIPT = resolve(__dirname, '../../../../scripts/functional_test_runner.js');
const CONFIG = resolve(__dirname, '../fixtures/with_es_archiver/config.js');

describe('single test that uses esArchiver', function () {
  this.timeout(3 * 60 * 1000);

  let log;
  const cleanupWork = [];

  before(async () => {
    log = createToolingLog('verbose', process.stdout);
    log.indent(6);

    const config = await readConfigFile(log, CONFIG);

    log.info('starting elasticsearch');
    log.indent(2);
    const es = await startupEs({
      log,
      port: config.get('servers.elasticsearch.port'),
      fresh: false
    });
    log.indent(-2);

    log.info('starting kibana');
    log.indent(2);
    const kibana = await startupKibana({
      port: config.get('servers.kibana.port'),
      esUrl: formatUrl(config.get('servers.elasticsearch'))
    });
    log.indent(-2);

    cleanupWork.push(() => es.shutdown());
    cleanupWork.push(() => kibana.close());
  });

  it('test', async () => {
    const proc = spawn(process.execPath, [SCRIPT, '--config', CONFIG], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const concatChunks = (acc, chunk) => `${acc}${chunk}`;
    const concatStdout = proc.stdout.pipe(createReduceStream(concatChunks));

    const [stdout] = await Promise.all([
      new Promise((resolve, reject) => {
        concatStdout.on('error', reject);
        concatStdout.on('data', resolve); // reduce streams produce a single value, no need to wait for anything else
      }),

      new Promise((resolve, reject) => {
        proc.on('error', reject);
        proc.on('close', resolve);
      })
    ]);

    log.debug(stdout.toString('utf8'));
  });

  after(() => {
    return Promise.all(cleanupWork.splice(0).map(fn => fn()));
  });
});
