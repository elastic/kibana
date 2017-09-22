import { BehaviorSubject, Observable } from 'rxjs/Rx';

function debug(name) {
  return {
    next(v) {
      console.log('N: %s', name, v);
    },
    error(error) {
      console.log('ERROR: %s', name, error);
    },
    complete() {
      console.log('COMPLETE: %s', name);
    }
  };
}

export function createIsEsUsable$(options) {
  const {
    test$,
    config,
    pluginExports,
    savedObjectMappings,
  } = options;

  const testResult$ = new BehaviorSubject(undefined);

  test$
    .do(debug('test$'))
    .throttleTime(1000, undefined, { leading: true, trailing: true })
    .subscribe({
      next() {
        // clear the test results to trigger a test on next observation
        testResult$.next(undefined);
      },
      complete() {
        testResult$.complete();
      }
    });

  async function attemptToPutIndexTemplate() {
    if (!pluginExports.elasticsearch) {
      return false;
    }

    const callCluster = pluginExports.elasticsearch.getCluster('admin').callWithInternalUser;
    const index = config.get('kibana.index');

    try {
      await callCluster('indices.putTemplate', {
        name: `kibana_index_template:${index}`,
        body: {
          template: index,
          settings: {
            number_of_shards: 1
          },
          mappings: savedObjectMappings.getDsl()
        }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  return new Observable(observer => {
    return testResult$
      .do(debug('testResult$'))
      .exhaustMap(async result => {
        if (result !== undefined) {
          observer.next(result);
          return;
        }

        // tell the observers that we are in progress
        observer.next(undefined);

        // get the new result
        const newResult = await attemptToPutIndexTemplate();

        // send the result to current observers
        observer.next(newResult);

        // record the test result so that future observers get it
        testResult$.next(newResult);
      })
      .subscribe();
  })
  .do(debug('isEsUsable$'))
  .shareReplay(1);
}
