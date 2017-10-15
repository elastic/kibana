export class SavedObjectsService {
  private readonly esClient;

  constructor(request, elasticsearch) {
    // pass in the cluster and the request headers
    // feels lighter than passing in request
    //
    // also SavedObjects always uses the admin cluster,
    // so it could make sense to do this in its constructor
    //
    // createClient would do getCluster + callWithRequest bound to a cluster
    //
    // we could even have the constructor take only:
    // - elasticsearch
    // - request headers
    this.esClient = elasticsearch.createClient('admin', request.headers);
    this.errors = {};
  }

  async update(type: string, id: string, attributes: { [key: string]: any }, options: { [key: string]: any }) {
    this.esClient.callCluster(method, params);
  }

  async create(type: string, attributes: { [key: string]: any }, options: { [key: string]: any }) {
    this.esClient.callCluster(method, params);
  }

  async get(type: string, id: string) {
    this.esClient.callCluster(method, params);
  }
}
