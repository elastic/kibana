import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Uppercase extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'uppercase',
      'Uppercase',
      `Converts a string to its uppercase equivalent.`,
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
        ignoreMissing: this.ignoreMissing
      }
    );
  }
};
