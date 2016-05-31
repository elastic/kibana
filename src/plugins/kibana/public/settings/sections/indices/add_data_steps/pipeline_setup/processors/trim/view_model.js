import Processor from '../base/view_model';

export class Trim extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'trim',
      'Trim',
      `Trims whitespace from field.`
    );
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
