import _ from 'lodash';
import keysDeep from './keys_deep';

class Processor {
  constructor(processorId, typeId, title, helpText) {
    if (!typeId || !title) {
      throw new Error('Cannot instantiate the base Processor class.');
    }

    this.processorId = processorId;
    this.title = title;
    this.typeId = typeId;
    this.helpText = helpText;
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
    super(
      processorId,
      'append',
      'Append',
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    );
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
    super(
      processorId,
      'convert',
      'Convert',
      'Nunc non ornare mi, et tempor nibh. Donec non massa condimentum urna vestibulum imperdiet sed a elit.'
    );
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
    super(
      processorId,
      'date',
      'Date',
      'Vestibulum placerat, arcu eu convallis egestas, nisl magna ' +
      'sollicitudin sem, eget rhoncus felis sem ut tortor. Maecenas ' +
      'ut rhoncus tortor. Maecenas consequat consectetur massa, rutrum ' +
      'venenatis elit facilisis sit amet. Pellentesque tristique, ' +
      'libero in venenatis aliquam, mi diam efficitur odio, non ' +
      'euismod odio ligula a mi.'
    );
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
    super(
      processorId,
      'geoip',
      'Geo IP',
      'Cras maximus neque eget faucibus consectetur. Ut tortor justo, efficitur nec nisl ac, volutpat sollicitudin sem.'
    );
    this.sourceField = '';
    this.targetField = '';
    this.databaseFile = '';
    this.databaseFields = [];
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
      databaseFile: this.databaseFile || '',
      databaseFields: this.databaseFields || []
    };
  }
};

export class Grok extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'grok',
      'Grok',
      'Duis laoreet ex vel enim hendrerit blandit. Quisque vel diam libero. Donec faucibus sed sem sit amet tempus.'
    );
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
    super(
      processorId,
      'gsub',
      'Gsub',
      'Suspendisse potenti. Nam nec dui euismod, imperdiet nibh a, hendrerit quam.'
    );
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
    super(
      processorId,
      'join',
      'Join',
      'Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Maecenas semper et sapien ac suscipit.'
    );
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
    super(
      processorId,
      'lowercase',
      'Lowercase',
      'Donec vehicula pellentesque ipsum et cursus.'
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

export class Remove extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'remove',
      'Remove',
      'Donec in odio consequat, condimentum justo eu, interdum arcu.'
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

export class Rename extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'rename',
      'Rename',
      'Etiam posuere quam sit amet sem mattis laoreet. Morbi fringilla odio ut risus volutpat, vitae laoreet orci pretium.'
    );
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
    super(
      processorId,
      'set',
      'Set',
      'Curabitur scelerisque ipsum augue, et varius lorem auctor non.'
    );
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

export class Split extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'split',
      'Split',
      'Donec elementum hendrerit lectus quis maximus. Nam magna purus, dapibus pretium libero placerat, pulvinar tempor arcu.'
    );
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

export class Trim extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'trim',
      'Trim',
      'Morbi enim purus, commodo at tellus sed, faucibus commodo sem.'
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

export class Uppercase extends Processor {
  constructor(processorId) {
    super(
      processorId,
      'uppercase',
      'Uppercase',
      'Fusce nulla nisl, ullamcorper eget convallis eget, viverra ut ' +
      'odio. Cras iaculis volutpat odio sit amet fermentum. Morbi risus ' +
      'mi, facilisis vitae pellentesque et, mattis sed risus.'
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
