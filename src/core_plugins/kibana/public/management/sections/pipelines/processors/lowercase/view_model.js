import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Lowercase extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'lowercase',
      'Lowercase',
      `Converts a string to its lowercase equivalent.`,
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
