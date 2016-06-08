import _ from 'lodash';
import Processor from '../base/view_model';

export class Gsub extends Processor {
  constructor(processorId, model) {
    super(
      processorId,
      'gsub',
      'Gsub',
      `Converts a string field by applying a regular expression and a replacement.`
    );

    _.defaults(
      this,
      _.pick(model, [
        'sourceField',
        'pattern',
        'replacement',
        'ignoreFailure'
      ]),
      {
        sourceField: '',
        pattern: '',
        replacement: '',
        ignoreFailure: false
      }
    );
  }

  get description() {
    const source = this.sourceField || '?';
    return `[${source}] - /${this.pattern}/ -> '${this.replacement}'`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      pattern: this.pattern || '',
      replacement: this.replacement || '',
      ignoreFailure: this.ignoreFailure
    };
  }
};
