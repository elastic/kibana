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
   *  Stores the esIsUsable state.
   *   `undefined`: state is not known, fetch is probably in progress, wait for the next value
   *   `true`: es is usable and we think it's in a good state
   *   `false`: es is not usable, we were not able to get it into a good state
   *  @type {BehaviorSubject}
   */
  const esIsUsable$ = new BehaviorSubject(undefined);
  sub.add(() => esIsUsable$.complete());

  /**
   *  Emits trigger checks for es availablility (throttled)
   *  @type {Subject}
   */
  const checkReq$ = new Subject();
  sub.add(
    checkReq$
      .throttleTime(1000, undefined, { leading: true, trailing: true })
      .exhaustMap(async () => {
        const esExports = server.plugins.elasticsearch;
        if (!esExports) {
          return esIsUsable$.next(false);
        }

        const callCluster = esExports.getCluster('admin').callWithInternalUser;
        const index = config.get('kibana.index');

        esIsUsable$.next(undefined);
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

          return esIsUsable$.next(true);
        } catch (error) {
          server.log(['error', 'savedObjects', 'putTemplate'], {
            tmpl: 'Failed to put index template "<%= err.message %>"',
            err: {
              message: error.message,
              stack: error.stack,
            }
          });
          return esIsUsable$.next(false);
        }
      })
      .catch((error, resubscribe) => {
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

    const esStatus = kbnServer.status.getForPluginId('elasticsearch');
    if (!esStatus) {
      return;
    }

    // check every time the elasticsearch plugin changes status
    sub.add(
      Observable
        .fromEvent(esStatus, 'change')
        .subscribe({
          next() {
            checkReq$.next();
          }
        })
    );
  });

  // when the server is stopping close the collective subscription
  server.ext('onPostStop', (server, next) => {
    sub.unsubscribe();
    next();
  });

  return new class EsAvailability {
    wrapCallClusterFunction(callCluster) {
      return async (method, params) => {
        const esIsUsable = await esIsUsable$
          .filter(usable => usable !== undefined)
          .take(1)
          .toPromise();

        if (!esIsUsable) { // could still be undefined if esIsUsable$ is completed while we wait
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
