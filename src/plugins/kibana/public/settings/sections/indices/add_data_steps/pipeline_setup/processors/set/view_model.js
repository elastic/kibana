import Processor from '../base/view_model';
import _ from 'lodash';

export class Set extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'set', 'Set');
    _.assign(this,
      {
        targetField: '',
        value: ''
      },
      _.pick(oldProcessor, ['targetField', 'value']));
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
      value: this.value || ''
    };
  }
};
