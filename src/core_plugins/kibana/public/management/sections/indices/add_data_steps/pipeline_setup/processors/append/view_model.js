import Processor from '../base/view_model';

export class Append extends Processor {
  constructor(processorId) {
    super(processorId, 'append', 'Append');
    this.targetField = '';
    this.values = [];
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
