import { flatten } from 'lodash';
//TODO: pull this in
import { collectDashboards } from './collect_dashboards';

export class PortDashboardsService {
  constructor(private readonly savedObjectsService) {
    this.savedObjectsService = savedObjectsService;
  }

  async importDashboards(query, payload) {
    const overwrite = 'force' in query && query.force !== false;
    const exclude = flatten([query.exclude]);

    const docs = payload.objects
      .filter(item => !exclude.includes(item.type));

    const objects = await this.savedObjectsService.bulkCreate(docs, { overwrite });
    return { objects };
  }

  async exportDashboards(dashboards, config) {
    const ids = _.flatten([dashboards]);

    const objects = await collectDashboards(this.savedObjectsService, ids);
    return {
      version: config.get('pkg.version'),
      objects,
    };
  }
}
