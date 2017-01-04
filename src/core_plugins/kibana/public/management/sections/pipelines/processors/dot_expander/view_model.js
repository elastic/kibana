import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Uppercase extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'dot_expander',
      'Dot Expander',
      `Expands a field with dots into an object field.`,
      'sourceField',
      {
        sourceField: '',
        path: ''
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
        path: this.path
      }
    );
  }
};
