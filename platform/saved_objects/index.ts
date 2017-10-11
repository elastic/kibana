export class SavedObjectsService {
  private readonly esClient;

  constructor(server, request) {
    // pass in the cluster and the request headers
    // feels lighter than passing in request
    this.esClient = server.plugins.elasticsearch.createClient('admin', request.headers);
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
