import _ from 'lodash';
import Processor from '../base/view_model';

export class GeoIp extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'geoip', 'Geo IP');
    _.assign(this,
      {
        sourceField: '',
        targetField: '',
        databaseFile: '',
        databaseFields: []
      },
      _.pick(oldProcessor, ['sourceField', 'targetField', 'databaseFile', 'databaseFields']));
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
