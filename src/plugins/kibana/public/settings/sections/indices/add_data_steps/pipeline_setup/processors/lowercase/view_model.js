import _ from 'lodash';
import Processor from '../base/view_model';

export class Lowercase extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'lowercase', 'Lowercase');
    _.assign(this,
      {
        sourceField: ''
      },
      _.pick(oldProcessor, ['sourceField']));
  }

  get description() {
    const source = this.sourceField || '?';
    return `[${source}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || ''
    };
  }
};
