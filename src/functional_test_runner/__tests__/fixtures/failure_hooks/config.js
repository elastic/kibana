import { delay } from 'bluebird';

export default function () {
  return {
    testFiles: [
      require.resolve('./tests/before_hook'),
      require.resolve('./tests/it'),
      require.resolve('./tests/after_hook')
    ],
    services: {
      hookIntoLIfecycle({ getService }) {
        const log = getService('log');

        getService('lifecycle')
          .on('testFailure', async (err, test) => {
            log.info('testFailure %s %s', err.message, test.fullTitle());
            await delay(10);
            log.info('testFailureAfterDelay %s %s', err.message, test.fullTitle());
          })
          .on('testHookFailure', async (err, test) => {
            log.info('testHookFailure %s %s', err.message, test.fullTitle());
            await delay(10);
            log.info('testHookFailureAfterDelay %s %s', err.message, test.fullTitle());
          });
      }
    }
  };
}
