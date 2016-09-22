import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Trim extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'trim',
      'Trim',
      `Trims whitespace from field.`,
      'sourceField',
      {
        sourceField: '',
        ignoreMissing: false
      },
      model
    );
  }

  get description() {
    const source = this.sourceField || '?';
    return `[${source}]`;
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        ignoreMissing: this.ignoreMissing      }
    );
  }
};
