import _ from 'lodash';
import Processor from '../base/view_model';

export class Join extends Processor {
  constructor(processorId, model) {
    super(
      processorId,
      'join',
      'Join',
      `Joins each element of an array into a single string using a
separator character between each element. `
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
    const separator = this.separator ? ` on '${this.separator}'` : '';
    return `[${source}]${separator}`;
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
