import { assign, isEmpty } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Json extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'json',
      'JSON',
      `Converts a JSON string into a structured JSON object.`,
      'sourceField',
      {
        sourceField: '',
        targetField: ''
      },
      model
    );
  }

  get description() {
    const source = this.sourceField || '?';
    const target = this.targetField || '?';
    if (isEmpty(target)) {
      return `[${source}]`;
    } else {
      return `[${source}] -> [${target}]`;
    }
  }

  get model() {
    return assign(
      super.model,
      {
        sourceField: this.sourceField || '',
        targetField: this.targetField || ''
      }
    );
  }
};
