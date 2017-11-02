import {
  Observable,
  Subscription,
  k$,
  map,
  filter,
  switchMap,
  shareLast
} from 'kbn-observable';

import { ElasticsearchClusterType } from './ElasticsearchConfig';
import { ElasticsearchConfigs } from './ElasticsearchConfigs';
import { Cluster } from './Cluster';
import { LoggerFactory } from '../../logging';
import { CoreService } from '../../types/CoreService';

type Clusters = { [type in ElasticsearchClusterType]: Cluster };

export class ElasticsearchService implements CoreService {
  private clusters$: Observable<Clusters>;
  private subscription?: Subscription;

  constructor(
    config$: Observable<ElasticsearchConfigs>,
    logger: LoggerFactory
  ) {
    const log = logger.get('elasticsearch');

    this.clusters$ = k$(config$)(
      filter(() => {
        if (this.subscription !== undefined) {
          log.error('clusters cannot be changed after they are created');
          return false;
        }

        return true;
      }),
      switchMap(
        configs =>
          new Observable<Clusters>(observer => {
            log.info('creating Elasticsearch clusters');

            const clusters = {
              data: new Cluster(configs.forType('data'), logger),
              admin: new Cluster(configs.forType('admin'), logger)
            };

            observer.next(clusters);

            return () => {
              log.info('closing Elasticsearch clusters');

              clusters.data.close();
              clusters.admin.close();
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
    this.subscription = this.clusters$.subscribe();
  }

  async stop() {
    if (this.subscription !== undefined) {
      this.subscription.unsubscribe();
    }
  }

  getClusterOfType$(type: ElasticsearchClusterType) {
    return k$(this.clusters$)(map(clusters => clusters[type]));
  }
}
