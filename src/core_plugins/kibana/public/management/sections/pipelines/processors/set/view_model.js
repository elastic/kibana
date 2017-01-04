import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Set extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'set',
      'Set',
      `Sets one field and associates it with the specified value. If the field
already exists, its value will be replaced with the provided one.`,
      'targetField',
      {
        targetField: '',
        value: '',
        override: true
      },
      model
    );
  }

  get description() {
    const target = this.targetField || '?';
    return `[${target}]`;
  }

  get model() {
    return assign(
      super.model,
      {
        targetField: this.targetField || '',
        value: this.value || '',
        override: this.override
      }
    );
  }
};
