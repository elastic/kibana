import _ from 'lodash';
import keysDeep from '../../lib/keys_deep';
import Processor from '../base/view_model';

export class Grok extends Processor {
  constructor(processorId) {
    super(processorId, 'grok', 'Grok');
    this.sourceField = '';
    this.pattern = '';
  }

  get description() {
    const inputKeys = keysDeep(this.inputObject);
    const outputKeys = keysDeep(this.outputObject);
    const addedKeys = _.difference(outputKeys, inputKeys);
    const added = addedKeys.sort().map(field => `[${field}]`).join(', ');
    const source = this.sourceField || '?';

    return `[${source}] -> ${added}`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      pattern: this.pattern || ''
    };
  }
};
