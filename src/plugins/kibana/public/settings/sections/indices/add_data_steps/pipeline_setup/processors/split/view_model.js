import _ from 'lodash';
import Processor from '../base/view_model';

export class Split extends Processor {
  constructor(processorId, model) {
    super(
      processorId,
      'split',
      'Split',
      `Splits a field into an array using a separator character.`
    );

    _.defaults(
      this,
      _.pick(model, [
        'sourceField',
        'separator',
        'ignoreFailure'
      ]),
      {
        sourceField: '',
        separator: '',
        ignoreFailure: false
      }
    );
  }

  get description() {
    const source = this.sourceField || '?';
    const separator = this.separator || '?';
    return `[${source}] on '${separator}'`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      separator: this.separator || '',
      ignoreFailure: this.ignoreFailure
    };
  }
};
