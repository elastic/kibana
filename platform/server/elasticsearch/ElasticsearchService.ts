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
  toPromise
} from '@elastic/kbn-observable';

import { ElasticsearchConfigs } from './ElasticsearchConfigs';
import { AdminClient } from './AdminClient';
import { ScopedDataClient } from './ScopedDataClient';
import { LoggerFactory } from '../../logging';
import { CoreService } from '../../types/CoreService';
import { Headers } from '../http/Router/headers';

type Clients = { data: Client, admin: Client };

export class ElasticsearchService implements CoreService {
  private clients$: Observable<Clients>;
  private subscription?: Subscription;

  constructor(
    config$: Observable<ElasticsearchConfigs>,
    logger: LoggerFactory
  ) {
    const log = logger.get('elasticsearch');

    this.clients$ = k$(config$)(
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
            log.info('creating Elasticsearch clusters');

            const clients = {
              data: new Client(configs.forType('data').toElasticsearchClientConfig()),
              admin: new Client(configs.forType('admin').toElasticsearchClientConfig({
                shouldAuth: false,
              }))
            };

            observer.next(clients);

            return () => {
              log.info('closing Elasticsearch clusters');

              clients.data.close();
              clients.admin.close();
            };
          })
      ),
      // We only want a single subscription of this as we only want to create a
      // single set of clusters at a time. We therefore share these, plus we
      // always replay the latest set of clusters when subscribing.
      shareLast()
    );
  }

  async start() {
    // ensure that we don't unnecessarily re-create clusters by always having
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
    return k$(this.clients$)(map(clients => new ScopedDataClient(clients.data, headers)));
  }

  getScopedDataClient(headers: Headers) {
    return k$(this.getScopedDataClient$(headers))(first(), toPromise());
  }

  // typed as a DataClient
  // for health check, e.g. which uses callWithInternalUser
  // const unscopedDataClient = elasticsearch.getUnscopedDataClient();

  // SAML or Basic Auth case
  // scoped adminClient
  // const scopedAdminClient = elasticsearch.getScopedAdminClient(headers);

  // example for adminclient
  // adminClient is the same across requests
  // const adminClient$ = elasticsearch.service.getAdminClient$();

}
