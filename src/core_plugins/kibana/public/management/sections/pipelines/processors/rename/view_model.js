import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Rename extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'rename',
      'Rename',
      `Renames an existing field.`,
      'sourceField',
      {
        sourceField: '',
        targetField: '',
        ignoreMissing: false
      },
      model
    );
  }

  get description() {
    const source = this.sourceField || '?';
    const target = this.targetField || '?';
    return `[${source}] -> [${target}]`;
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        targetField: this.targetField || '',
        ignoreMissing: this.ignoreMissing      }
    );
  }
};
