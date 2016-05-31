import _ from 'lodash';
import Processor from '../base/view_model';

export class Uppercase extends Processor {
  constructor(processorId, oldProcessor) {
    super(
      processorId,
      'uppercase',
      'Uppercase',
      `Converts a string to its uppercase equivalent.`
    );

    _.defaults(
      this,
      _.pick(oldProcessor, [
        'sourceField'
      ]),
      {
        sourceField: ''
      }
    );
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
