import { assign, isEmpty } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Date extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'date',
      'Date',
      `Parses dates from fields.`,
      'sourceField',
      {
        sourceField: '',
        targetField: '@timestamp',
        formats: [],
        timezone: 'Etc/UTC',
        locale: 'ENGLISH'
      },
      model
    );
  }

  get description() {
    const source = this.sourceField || '?';
    const target = this.targetField || '?';
    if (isEmpty(target)) {
      return `[${source}]`;
    } else {
      return `[${source}] -> [${target}]`;
    }
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        targetField: this.targetField || '',
        formats: this.formats || [],
        timezone: this.timezone || '',
        locale: this.locale || ''
      }
    );
  }
};
