import _ from 'lodash';
import Processor from '../base/view_model';

export class Gsub extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'gsub', 'Gsub');
    _.assign(this,
      {
        sourceField: '',
        pattern: '',
        replacement: ''
      },
      _.pick(oldProcessor, ['sourceField', 'pattern', 'replacement']));
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
      replacement: this.replacement || ''
    };
  }
};
