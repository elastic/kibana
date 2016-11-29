import Processor from '../base/view_model';

export class GeoIp extends Processor {
  constructor(processorId) {
    super(processorId, 'geoip', 'Geo IP');
    this.sourceField = '';
    this.targetField = '';
    this.databaseFile = '';
    this.databaseFields = [];
  }

  get description() {
    const source = this.sourceField || '?';
    const target = this.targetField || '?';
    return `[${source}] -> [${target}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      targetField: this.targetField || '',
      databaseFile: this.databaseFile || '',
      databaseFields: this.databaseFields || []
    };
  }
};
