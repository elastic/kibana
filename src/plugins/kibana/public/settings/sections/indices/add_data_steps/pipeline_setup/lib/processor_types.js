import _ from 'lodash';
import keysDeep from './keys_deep';

class Processor {
  constructor(processorId, typeId, title) {
    if (!typeId || !title) {
      throw new Error('Cannot instantiate the base Processor class.');
    }

    this.processorId = processorId;
    this.title = title;
    this.typeId = typeId;
    this.collapsed = false;
    this.parent = undefined;
    this.inputObject = undefined;
    this.outputObject = undefined;
    this.error = undefined;
  }

  setParent(newParent) {
    const oldParent = this.parent;
    this.parent = newParent;

    return (oldParent !== this.parent);
  }
}

export class Append extends Processor {
  constructor(processorId) {
    super(processorId, 'append', 'Append');
    this.targetField = '';
    this.values = [];
  }

  get description() {
    const target = this.targetField || '?';
    return `[${target}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      targetField: this.targetField || '',
      values: this.values || []
    };
  }
};

export class Convert extends Processor {
  constructor(processorId) {
    super(processorId, 'convert', 'Convert');
    this.sourceField = '';
    this.targetField = '';
    this.type = 'auto';
  }

  get description() {
    const source = this.sourceField || '?';
    const type = this.type || '?';
    const target = this.targetField ? ` -> [${this.targetField}]` : '';
    return `[${source}] to ${type}${target}`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      targetField: this.targetField || '',
      type: this.type || 'auto'
    };
  }
};

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

export class GeoIp extends Processor {
  constructor(processorId) {
    super(processorId, 'geoip', 'Geo IP');
    this.sourceField = '';
    this.targetField = 'geoip';
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
      targetField: this.targetField || ''
    };
  }
};

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

export class Gsub extends Processor {
  constructor(processorId) {
    super(processorId, 'gsub', 'Gsub');
    this.sourceField = '';
    this.pattern = '';
    this.replacement = '';
  }

  get description() {
    const source = this.sourceField || '?';
    return `[${source}] - /${this.pattern}/ -> '${this.replacement}'`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      sourceField: this.sourceField || '',
      pattern: this.pattern || '',
      replacement: this.replacement || ''
    };
  }
};

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

export class Lowercase extends Processor {
  constructor(processorId) {
    super(processorId, 'lowercase', 'Lowercase');
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

export class Remove extends Processor {
  constructor(processorId) {
    super(processorId, 'remove', 'Remove');
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

export class Rename extends Processor {
  constructor(processorId) {
    super(processorId, 'rename', 'Rename');
    this.sourceField = '';
    this.targetField = '';
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
      targetField: this.targetField || ''
    };
  }
};

export class Set extends Processor {
  constructor(processorId) {
    super(processorId, 'set', 'Set');
    this.targetField = '';
    this.value = '';
  }

  get description() {
    const target = this.targetField || '?';
    return `[${target}]`;
  }

  get model() {
    return {
      processorId: this.processorId,
      typeId: this.typeId,
      targetField: this.targetField || '',
      value: this.value || ''
    };
  }
};
