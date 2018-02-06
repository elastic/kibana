import { spawn } from 'child_process';
import { resolve } from 'path';
import { format as formatUrl } from 'url';

import expect from 'expect.js';

import { readConfigFile } from '../../lib';
import { createToolingLog } from '../../../dev';
import { createReduceStream } from '../../../utils';
import { createEsTestCluster } from '../../../test_utils/es';
import { startupKibana } from '../lib';

const SCRIPT = resolve(__dirname, '../../../../scripts/functional_test_runner.js');
const CONFIG = resolve(__dirname, '../fixtures/with_es_archiver/config.js');

describe('single test that uses esArchiver', () => {
  let log;
  const cleanupWork = [];

  before(async function () {
    log = createToolingLog('debug');
    log.pipe(process.stdout);
    log.indent(6);

    const config = await readConfigFile(log, CONFIG);

    log.info('starting elasticsearch');
    log.indent(2);

    const es = createEsTestCluster({
      log: msg => log.debug(msg),
      name: 'ftr/withEsArchiver',
      port: config.get('servers.elasticsearch.port')
    });
    cleanupWork.unshift(() => es.stop());

    this.timeout(es.getStartTimeout());
    await es.start();

    log.indent(-2);

    log.info('starting kibana');
    log.indent(2);
    const kibana = await startupKibana({
      port: config.get('servers.kibana.port'),
      esUrl: formatUrl(config.get('servers.elasticsearch'))
    });
    log.indent(-2);

    cleanupWork.unshift(() => kibana.close());
  });

  it('test', async function () {
    this.timeout(10000);
    const proc = spawn(process.execPath, [SCRIPT, '--config', CONFIG], {
      stdio: ['ignore', 'pipe', 'ignore']
    });

    const concatChunks = (acc, chunk) => `${acc}${chunk}`;
    const concatStdout = proc.stdout.pipe(createReduceStream(concatChunks));

    const [stdout, exitCode] = await Promise.all([
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
    expect(exitCode).to.be(0);
  });

  after(async () => {
    for (const work of cleanupWork.splice(0)) {
      await work();
    }
  });
});
