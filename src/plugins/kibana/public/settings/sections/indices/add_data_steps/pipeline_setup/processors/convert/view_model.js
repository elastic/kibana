import _ from 'lodash';
import Processor from '../base/view_model';

export class Convert extends Processor {
  constructor(processorId, model) {
    super(
      processorId,
      'convert',
      'Convert',
      `Converts an existing field’s value to a different type, such as converting
a string to an integer. If the field value is an array, all members will be
converted.`
    );

    _.defaults(
      this,
      _.pick(model, [
        'sourceField',
        'targetField',
        'type',
        'ignoreFailure'
      ]),
      {
        sourceField: '',
        targetField: '',
        type: 'auto',
        ignoreFailure: false
      }
    );
  }

  get description() {
    const source = this.sourceField || '?';
    const type = this.type || '?';
    const target = this.targetField ? ` -> [${this.targetField}]` : '';
    return `[${source}] to ${type}${target}`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      targetField: this.targetField || '',
      type: this.type || 'auto',
      ignoreFailure: this.ignoreFailure
    };
  }
};
