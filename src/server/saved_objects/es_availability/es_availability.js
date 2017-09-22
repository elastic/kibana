import Boom from 'boom';
import { Subscription, BehaviorSubject, Subject, Observable } from 'rxjs/Rx';
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

  sub.add(
    checkReq$
      // throttle check requests so that we only have one every 1 second at the most
      .throttleTime(1000, undefined, { leading: true, trailing: true })
      // and after that, if a check is delivered before the previous has
      // completed exhaustMap ignores it
      .exhaustMap(async () => {
        const esExports = server.plugins.elasticsearch;
        if (!esExports) {
          esIsAvailable$.next(false);
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
          return esIsAvailable$.next(true);
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
          return esIsAvailable$.next(false);
        }
      })
      .catch((error, resubscribe) => {
        // this should only happen if there is a syntax error,
        // undefined methods, or something like that.
        server.log(['error', 'savedObjects'], {
          tmpl: 'Failure attempting to set index template "<%= err.message %>"',
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
    checkReq$.next();

    // try to get the elasticsearch plugin's status. if it's disabled then we just hang out
    const esStatus = kbnServer.status.getForPluginId('elasticsearch');
    if (!esStatus) {
      return;
    }

    sub.add(
      Observable
        // listen to es plugin's status and on each change
        .fromEvent(esStatus, 'change', (prev, prevMsg, state) => state)
        // determine if the status is green or not
        .map(state => state === 'green')
        // when we toggle between green and not green
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

        // PS, availability could still be undefined if esIsAvailable$
        // completes before producing anything other than undefined
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
