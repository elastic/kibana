import _ from 'lodash';
import Processor from '../base/view_model';

export class Trim extends Processor {
  constructor(processorId, model) {
    super(
      processorId,
      'trim',
      'Trim',
      `Trims whitespace from field.`
    );

    _.defaults(
      this,
      _.pick(model, [
        'sourceField',
        'ignoreFailure'
      ]),
      {
        sourceField: '',
        ignoreFailure: false
      }
    );
  }

  get description() {
    const source = this.sourceField || '?';
    return `[${source}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      ignoreFailure: this.ignoreFailure
    };
  }
};
