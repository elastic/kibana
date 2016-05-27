import _ from 'lodash';
import Processor from '../base/view_model';

export class Append extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'append', 'Append');
    _.assign(this,
      {
        targetField: '',
        values: []
      },
      _.pick(oldProcessor, ['targetField', 'values']));
  }

  get description() {
    const target = this.targetField || '?';
    return `[${target}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      targetField: this.targetField || '',
      values: this.values || []
    };
  }
};
