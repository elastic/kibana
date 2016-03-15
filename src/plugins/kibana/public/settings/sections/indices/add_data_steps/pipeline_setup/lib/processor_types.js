export class Processor {
  constructor(processorId) {
    this.processorId = processorId;
    this.typeId = 'base';
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

export class SetProcessor extends Processor {
  constructor(processorId) {
    super(processorId);
    this.title = 'Set';
    this.typeId = 'set';
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
