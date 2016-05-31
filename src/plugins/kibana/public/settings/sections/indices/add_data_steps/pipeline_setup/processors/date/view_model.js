import _ from 'lodash';
import Processor from '../base/view_model';

export class Date extends Processor {
  constructor(processorId, oldProcessor) {
    super(
      processorId,
      'date',
      'Date',
      `Parses dates from fields.`
    );

    _.defaults(
      this,
      _.pick(oldProcessor, [
        'sourceField',
        'targetField',
        'formats',
        'timezone',
        'locale',
        'customFormat'
      ]),
      {
        sourceField: '',
        targetField: '@timestamp',
        formats: [],
        timezone: 'Etc/UTC',
        locale: 'ENGLISH',
        customFormat: ''
      }
    );
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
      formats: this.formats || [],
      timezone: this.timezone || '',
      locale: this.locale || '',
      customFormat: this.customFormat || ''
    };
  }
};
