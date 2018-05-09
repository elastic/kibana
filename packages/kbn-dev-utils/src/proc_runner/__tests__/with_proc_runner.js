import { createToolingLog } from '../../tooling_log';
import { withProcRunner } from '../with_proc_runner';

describe('proc runner', () => {
  function runProc({ thing = '', procs }) {
    return new Promise(resolve => {
      setTimeout(() => {
        procs.run('proc', {
          cmd: './proc',
          args: ['these', 'are', 'words'],
        });
        resolve(thing);
      }, 500);
    });
  }

  it('passes procs to a function', async () => {
    await withProcRunner(createToolingLog(), async procs => {
      await runProc({ procs });
      await procs.stop('proc');
    });
  });
});
