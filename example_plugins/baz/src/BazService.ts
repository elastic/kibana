import {
  k$,
  Observable,
  $combineLatest,
  map,
  first,
  toPromise
} from '@elastic/kbn-observable';

import {
  ElasticsearchService,
  KibanaConfig,
} from '@elastic/kbn-types';

export class BazService {
  private readonly _esService: any; // help, this is really a function

  // NB: When we finally create BazService, we have a request
  // object. That's why we can pass in headers and get an elasticsearch
  // service scoped to the request.
  //
  // But we can also choose the cluster to bind all our elasticsearch
  // calls to. What if we could do both in one step at this high level?
  constructor(
    private readonly headers: string,
    private readonly kibanaConfig$: Observable<KibanaConfig>,
    private readonly elasticsearchService: ElasticsearchService
  ) {
    // NB: This is where we should bind to the right cluster for
    // elasticsearch service.
    //
    // We could do it directly in the exposed BazService methods,
    // but that feels too late, and it also feels like a lot of
    // extra cruft for plugin developers.
    //
    // We can assume all the routes for a service will call internal
    // services (like elasticsearch) with the same settings.
    // If Baz Plugin needs to hit a different cluster, then there
    // can be a BazBarService, sister to BazService, that binds to
    // that other cluster.
    //
    // The drawback might be: is this too early to bind, since
    // the configuration could change? We're creating this service
    // and then immediately handling the request, so I think it's fine,
    // but there's nothing enforcing plugin developers to write
    // this way.

    this._esService = this.elasticsearchService.getScopedCluster('admin', this.headers);
  }

  async find(options: { type: string; page?: number; perPage?: number }) {
    const { page = 1, perPage = 20, type } = options;

    // NB: May need to actually set the _esService here instead
    // so that it is the latestValue
    const [kibanaIndex] = await latestValues(
      k$(this.kibanaConfig$)(map(config => config.index)),
    );

    // NB: Use the new scoped es service something like this:
    const response = await this._esService.search({
      index: kibanaIndex,
      type,
      size: perPage,
      from: perPage * (page - 1)
    });

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
  return k$($combineLatest(values))(first(), toPromise());
}
