import { spawnSync } from 'child_process';
import { resolve } from 'path';

import expect from 'expect.js';

const SCRIPT = resolve(__dirname, '../../../../scripts/functional_test_runner.js');
const BASIC_CONFIG = resolve(__dirname, '../fixtures/simple_project/config.js');

describe('basic config file with a single app and test', function () {
  this.timeout(60 * 1000);

  it('runs and prints expected output', () => {
    const proc = spawnSync(process.execPath, [SCRIPT, '--config', BASIC_CONFIG]);
    const stdout = proc.stdout.toString('utf8');
    expect(stdout).to.contain('$BEFORE$');
    expect(stdout).to.contain('$TESTNAME$');
    expect(stdout).to.contain('$INTEST$');
    expect(stdout).to.contain('$AFTER$');
  });
});
