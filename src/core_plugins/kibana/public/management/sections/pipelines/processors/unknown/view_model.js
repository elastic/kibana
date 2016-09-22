import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Unknown extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'unknown',
      'Unknown',
      `Dummy`,
      undefined,
      {
        json: '',
        unknownTypeId: ''
      },
      model
    );
  }

  get description() {
    return `(${this.unknownTypeId})`;
  }

  get model() {
    return assign(
      super.model,
      {
        json: this.json || '',
        unknownTypeId: this.unknownTypeId || ''
      }
    );
  }
};
