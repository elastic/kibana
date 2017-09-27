import Boom from 'boom';
import { delay } from 'bluebird';
import { Subscription, BehaviorSubject, Subject, Observable } from 'rxjs/Rx';

import { mergeMapLatest } from './lib';

import { errors } from '../client';

export function createEsAvailability(kbnServer) {
  const { server, config, savedObjectMappings } = kbnServer;

  /**
   *  Collective subscription, closed/torn-down when the server stops
   *  @type {Subscription}
   */
  const sub = new Subscription();

  /**
   *  Stores the esIsAvailable state.
   *   `undefined`: state is not known, fetch is probably in progress, wait for the next value
   *   `true`: es is available and we think it's in a good state
   *   `false`: es is not available, we were not able to get it into a good state
   *  @type {BehaviorSubject}
   */
  const esIsAvailable$ = new BehaviorSubject(undefined);

  // complete esIsAvailable$ when the subscription is torn down so
  // that pending requests will be released
  sub.add(() => esIsAvailable$.complete());

  /**
   *  Emits when a check is requested
   *  @type {Subject}
   */
  const checkReq$ = new Subject();

  /**
   *  Runs the check, which attempts to put the indexTemplate to elasticsearch
   *  and will eventually patch the index if it already exists
   *  @return {Promise<undefined>}
   */
  async function check() {
    const esExports = server.plugins.elasticsearch;

    if (!esExports) {
      // the `kbnServer.ready()` handler will prevent check from
      // running after we know that elasticsearch is not enabled, but
      // it's possible it will be triggered before that happens
      return;
    }

    const callCluster = esExports.getCluster('admin').callWithInternalUser;
    const index = config.get('kibana.index');

    // tell external parties that we don't know if es is available right now,
    // they should wait to see what we discover
    esIsAvailable$.next(undefined);

    try {
      // try to add the index template to elasticsearch. if it already exists
      // then a new version will be written
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

      // TODO: we need to check for existing index and make sure it
      // has the types it needs

      // es seems to be available, let the listeners know
      esIsAvailable$.next(true);
    } catch (error) {
      // we log every error
      server.log(['error', 'savedObjects', 'putTemplate'], {
        tmpl: 'Failed to put index template "<%= err.message %>"',
        err: {
          message: error.message,
          stack: error.stack,
        }
      });

      // and then notify listeners that es is not available
      esIsAvailable$.next(false);

      // wait for 1 second before finishing this check so that we don't pound elasticsearch too hard
      await delay(1000);
    }
  }

  sub.add(
    checkReq$
      // mergeMapLatest will run check() for each request
      // and buffer up to requests that arrives while it
      // is processing.
      .let(mergeMapLatest(check))

      // this should only happen if there is a syntax error,
      // undefined methods, or something like that, but since
      // we are not "supervised" by a request or anything we
      // need to log and resubscribe
      .catch((error, resubscribe) => {
        server.log(['error', 'savedObjects'], {
          tmpl: 'Error in savedObjects/esAvailability check "<%= err.message %>"',
          err: {
            message: error.message,
            stack: error.stack
          }
        });

        return resubscribe;
      })
      .subscribe()
  );


  // when the kbnServer is ready plugins have loaded, so if
  // elasticsearch is enabled it will be available on the server now
  kbnServer.ready().then(() => {
    const esStatus = kbnServer.status.getForPluginId('elasticsearch');

    if (!esStatus) {
      esIsAvailable$.complete();
      checkReq$.complete();
      return;
    }

    sub.add(
      Observable
        // event the state of the es plugin whenever it changes
        .fromEvent(esStatus, 'change', (prev, prevMsg, state) => state)
        // start with the current state
        .startWith(esStatus.switch)
        // determine if the status is green or not
        .map(state => state === 'green')
        // toggle between green and not green
        .distinctUntilChanged()
        // request a check
        .subscribe(() => checkReq$.next())
    );
  });

  // when the server is stopping close the collective subscription
  server.ext('onPreStop', (server, next) => {
    sub.unsubscribe();
    next();
  });

  return new class EsAvailability {
    wrapCallClusterFunction(callCluster) {
      return async (method, params) => {
        // wait for the first non-undefined availablility
        const esIsAvailable = await esIsAvailable$
          .filter(available => available !== undefined)
          .take(1)
          .toPromise();

        // esIsAvailable will still be undefined in some
        // scenarios (like es is disabled) so use falsy check
        if (!esIsAvailable) {
          checkReq$.next();
          throw errors.decorateEsUnavailableError(
            Boom.serverUnavailable('Elasticsearch is unavailable')
          );
        }

        try {
          return await callCluster(method, params);
        } catch (error) {
          if (!error || !error.status || error.status >= 500) {
            checkReq$.next();
          }

          throw error;
        }
      };
    }
  };
}
