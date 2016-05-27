import _ from 'lodash';
import Processor from '../base/view_model';

export class Split extends Processor {
  constructor(processorId, oldProcessor) {
    super(processorId, 'split', 'Split');
    _.assign(this,
      {
        sourceField: '',
        separator: ''
      },
      _.pick(oldProcessor, ['sourceField', 'separator']));
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
      separator: this.separator || ''
    };
  }
};
