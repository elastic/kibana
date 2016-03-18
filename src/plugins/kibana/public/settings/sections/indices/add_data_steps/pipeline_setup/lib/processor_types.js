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
      targetField: this.targetField,
      value: this.value
    };
  }
};
