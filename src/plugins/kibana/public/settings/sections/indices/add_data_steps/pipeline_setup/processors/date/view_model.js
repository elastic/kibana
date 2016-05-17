import Processor from '../base/view_model';

export class Date extends Processor {
  constructor(processorId) {
    super(processorId, 'date', 'Date');
    this.sourceField = '';
    this.targetField = '@timestamp';
    this.formats = [];
    this.timezone = 'Etc/UTC';
    this.locale = 'ENGLISH';
    this.customFormat = '';
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
      targetField: this.targetField || '',
      formats: this.formats || [],
      timezone: this.timezone || '',
      locale: this.locale || '',
      customFormat: this.customFormat || ''
    };
  }
};
