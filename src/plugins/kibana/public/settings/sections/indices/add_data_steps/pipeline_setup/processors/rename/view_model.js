import Processor from '../base/view_model';

export class Rename extends Processor {
  constructor(processorId) {
    super(processorId, 'rename', 'Rename');
    this.sourceField = '';
    this.targetField = '';
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
