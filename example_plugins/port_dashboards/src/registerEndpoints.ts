import { exportDashboards } from '../../../lib/export/export_dashboards';
import { importDashboards } from '../../../lib/import/import_dashboards';
import { SavedObjectsService } from '../../../../../../../platform/saved_objects';
import Boom from 'boom';
import Joi from 'joi';
import moment from 'moment';
import { Router, LoggerFactory, Schema } from 'kbn-types';

export function registerEndpoints(
  router: Router<PortDashboards>,
  logger: LoggerFactory,
  schema: Schema,
  config,
  SavedObjectsService,
  elasticsearch,
) {
  const log = logger.get('routes');

  router.get(
    {
      path: '/api/kibana/dashboards/export',
      validate: {
        query: object({
          dashboard: [string()] or string(),
        }),
      },
    },
    async (request, response) {
      const currentDate = moment.utc();
      const savedObjectsService = new SavedObjectsService(req, elasticsearch);

      return exportDashboards(req.query.dashboard, config(), savedObjectsService)
        .then(resp => {
          const json = JSON.stringify(resp, null, '  ');
          const filename = `kibana-dashboards.${currentDate.format('YYYY-MM-DD-HH-mm-ss')}.json`;
          reply(json)
            .header('Content-Disposition', `attachment; filename="${filename}"`)
            .header('Content-Type', 'application/json')
            .header('Content-Length', json.length);
        })
        .catch(err => reply(Boom.boomify(err, { statusCode: 400 })));
    }
  );

  router.post(
    {
      path: '/api/kibana/dashboards/import',
      validate: {
        payload: object({
          objects: [object()],
          version: string(),
        }),
        query: object({
          force: boolean(), //TODO: default false
          exclude: string() or [string()],
        }),
      },
    },
    async (request, response) {
      const savedObjectsService = new SavedObjectsService(req, elasticsearch);

      return importDashboards(req.query, payload, savedObjectsService)
        .then((resp) => reply(resp))
        .catch(err => reply(Boom.boomify(err, { statusCode: 400 })));
    }
  );
}
