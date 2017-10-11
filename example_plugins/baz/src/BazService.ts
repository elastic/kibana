import { Observable } from 'rxjs';

import { ElasticsearchService, KibanaConfig, KibanaRequest } from 'kbn-types';

export class BazService {
  constructor(
    private readonly req: KibanaRequest,
    private readonly kibanaConfig$: Observable<KibanaConfig>,
    private readonly elasticsearchService: ElasticsearchService
  ) {}

  async find(options: { type: string; page?: number; perPage?: number }) {
    const { page = 1, perPage = 20, type } = options;

    const [kibanaIndex, adminCluster] = await latestValues(
      this.kibanaConfig$.map(config => config.index),
      this.elasticsearchService.getClusterOfType$('admin')
    );

    const response = await adminCluster.withRequest(
      this.req,
      (client, headers) =>
        client.search({
          // headers,
          // TODO ^ buggy elasticsearch.js typings!
          index: kibanaIndex,
          type,
          size: perPage,
          from: perPage * (page - 1)
        })
    );

    const data = response.hits.hits.map(hit => ({
      id: hit._id,
      type: hit._type,
      version: hit._version,
      attributes: hit._source
    }));

    return {
      data,
      total: response.hits.total,
      per_page: perPage,
      page: page
    };
  }
}

// Just a helper to extract the latest values from observables
function latestValues<A>(a: Observable<A>): Promise<[A]>;
function latestValues<A, B>(
  a: Observable<A>,
  b: Observable<B>
): Promise<[A, B]>;
function latestValues<A, B, C>(
  a: Observable<A>,
  b: Observable<B>,
  c: Observable<C>
): Promise<[A, B, C]>;
function latestValues<A, B, C, D>(
  a: Observable<A>,
  b: Observable<B>,
  c: Observable<C>,
  d: Observable<D>
): Promise<[A, B, C, D]>;
function latestValues(...values: Observable<any>[]) {
  return Observable.combineLatest(values)
    .first()
    .toPromise();
}
