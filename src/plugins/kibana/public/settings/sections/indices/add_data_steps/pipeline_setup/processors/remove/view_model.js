import _ from 'lodash';
import Processor from '../base/view_model';

export class Remove extends Processor {
  constructor(processorId, oldProcessor) {
    super(
      processorId,
      'remove',
      'Remove',
      `Removes an existing field.`
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
