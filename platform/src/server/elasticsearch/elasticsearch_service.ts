import { Client } from 'elasticsearch';
import {
  Observable,
  Subscription,
  k$,
  map,
  filter,
  switchMap,
  shareLast,
  first,
  toPromise,
  $combineLatest,
} from '@kbn/observable';

import { ElasticsearchConfigs } from './elasticsearch_configs';
import { AdminClient } from './admin_client';
import { ScopedDataClient } from './scoped_data_client';
import { LoggerFactory } from '../../logging';
import { CoreService } from '../../types/core_service';
import { Headers } from '../http/router/headers';

type Clients = { data: Client; admin: Client };

export class ElasticsearchService implements CoreService {
  private clients$: Observable<Clients>;
  private subscription?: Subscription;

  constructor(
    private readonly configs$: Observable<ElasticsearchConfigs>,
    logger: LoggerFactory
  ) {
    const log = logger.get('elasticsearch');

    this.clients$ = k$(configs$)(
      filter(() => {
        if (this.subscription !== undefined) {
          log.error('clusters cannot be changed after they are created');
          return false;
        }

        return true;
      }),
      switchMap(
        configs =>
          new Observable<Clients>(observer => {
            log.info('creating Elasticsearch clients');

            const clients = {
              data: new Client(
                configs.forType('data').toElasticsearchClientConfig()
              ),
              admin: new Client(
                configs.forType('admin').toElasticsearchClientConfig({
                  shouldAuth: false,
                })
              ),
            };

            observer.next(clients);

            return () => {
              log.info('closing Elasticsearch clients');

              clients.data.close();
              clients.admin.close();
            };
          })
      ),
      // We only want a single subscription of this as we only want to create a
      // single set of clients at a time. We therefore share these, plus we
      // always replay the latest set of clusters when subscribing.
      shareLast()
    );
  }

  async start() {
    // ensure that we don't unnecessarily re-create clients by always having
    // at least one current connection
    this.subscription = this.clients$.subscribe();
  }

  async stop() {
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }
  }

  getAdminClient$() {
    return k$(this.clients$)(map(clients => new AdminClient(clients.admin)));
  }

  getScopedDataClient$(headers: Headers) {
    return k$($combineLatest(this.clients$, this.configs$))(
      map(
        ([clients, configs]) =>
          new ScopedDataClient(
            clients.data,
            configs.forType('data').filterHeaders(headers)
          )
      )
    );
  }

  getScopedDataClient(headers: Headers) {
    return k$(this.getScopedDataClient$(headers))(first(), toPromise());
  }
}
