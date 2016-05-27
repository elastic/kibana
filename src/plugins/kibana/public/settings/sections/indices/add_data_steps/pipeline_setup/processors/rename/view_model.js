import _ from 'lodash';
import Processor from '../base/view_model';

export class Rename extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'rename', 'Rename');
    _.assign(this,
      {
        sourceField: '',
        targetField: ''
      },
      _.pick(oldProcessor, ['sourceField', 'targetField']));
  }

  get description() {
    const source = this.sourceField || '?';
    const target = this.targetField || '?';
    return `[${source}] -> [${target}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      targetField: this.targetField || ''
    };
  }
};
