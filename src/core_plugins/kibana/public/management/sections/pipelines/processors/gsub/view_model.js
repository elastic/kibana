import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Gsub extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'gsub',
      'Gsub',
      `Converts a string field by applying a regular expression and a replacement.`,
      'sourceField',
      {
        sourceField: '',
        pattern: '',
        replacement: ''
      },
      model
    );
  }

  get description() {
    const source = this.sourceField || '?';
    return `[${source}] - /${this.pattern}/ -> '${this.replacement}'`;
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        pattern: this.pattern || '',
        replacement: this.replacement || ''
      }
    );
  }
};
