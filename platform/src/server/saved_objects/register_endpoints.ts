import { ElasticsearchService } from '../elasticsearch';
export function registerEndpoints(
  router: KibanaRouter,
  logger,
  schema,
  esService: ElasticsearchService,
  config$,
) {
  router.route(createBulkGetRoute(prereqs));
  router.route(createCreateRoute(prereqs));
  router.route(createDeleteRoute(prereqs));
  router.route(createFindRoute(prereqs));
  router.route(createGetRoute(prereqs));
  router.route(createUpdateRoute(prereqs));
}
