import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class DateIndexName extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'date_index_name',
      'Date Index Name',
      `Assigns the _index meta field with a date math index name expression based on the provided
index name prefix, date or timestamp field in the documents being
processed and the provided date rounding.`,
      'sourceField',
      {
        sourceField: '',
        indexNamePrefix: '',
        dateRounding: '',
        dateFormats: [],
        timezone: '',
        locale: '',
        indexNameFormat: ''
      },
      model
    );
  }

  get description() {
    const target = this.sourceField || '?';
    return `[${target}]`;
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        indexNamePrefix: this.indexNamePrefix || '',
        dateRounding: this.dateRounding || '',
        dateFormats: this.dateFormats || [],
        timezone: this.timezone || '',
        locale: this.locale || '',
        indexNameFormat: this.indexNameFormat || ''
      }
    );
  }
};
