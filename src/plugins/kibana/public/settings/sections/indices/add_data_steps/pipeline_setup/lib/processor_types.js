export class Processor {
  constructor(processorId) {
    this.collapsed = false;
    this.parent = undefined;
    this.inputObject = undefined;
    this.outputObject = undefined;
    this.error = undefined;

    this.data = {
      processorId,
      typeId: 'base'
    };
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
    this.data.typeId = 'set';
    this.data.targetField = '';
    this.data.value = '';
  }

  get description() {
    const target = this.data.targetField || '?';
    return `[${target}]`;
  }
};
