import Processor from '../base/view_model';

export class Split extends Processor {
  constructor(processorId) {
    super(processorId, 'split', 'Split');
    this.sourceField = '';
    this.separator = '';
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
