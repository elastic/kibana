import Processor from '../base/view_model';

export class Uppercase extends Processor {
  constructor(processorId) {
    super(processorId, 'uppercase', 'Uppercase');
    this.sourceField = '';
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
