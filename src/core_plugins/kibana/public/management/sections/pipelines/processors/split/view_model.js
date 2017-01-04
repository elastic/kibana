import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Split extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'split',
      'Split',
      `Splits a field into an array using a separator character.`,
      'sourceField',
      {
        sourceField: '',
        separator: ''
      },
      model
    );
  }

  get description() {
    const source = this.sourceField || '?';
    const separator = this.separator || '?';
    return `[${source}] on '${separator}'`;
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        separator: this.separator || ''
      }
    );
  }
};
