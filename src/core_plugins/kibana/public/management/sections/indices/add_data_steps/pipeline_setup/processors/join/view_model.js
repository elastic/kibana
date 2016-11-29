import Processor from '../base/view_model';

export class Join extends Processor {
  constructor(processorId) {
    super(processorId, 'join', 'Join');
    this.sourceField = '';
    this.separator = '';
  }

  get description() {
    const source = this.sourceField || '?';
    const separator = this.separator ? ` on '${this.separator}'` : '';
    return `[${source}]${separator}`;
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
