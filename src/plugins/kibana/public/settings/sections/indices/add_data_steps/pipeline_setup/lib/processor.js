import _ from 'lodash';

export default class Processor {

  constructor(processorType) {
    this.collapsed = false;
    this.error = undefined;

    _.merge(this, processorType);
  }

  setParent(newParent) {
    const oldParent = this.parent;
    this.parent = newParent;

    return (oldParent !== this.parent);
  }

  updateDescription() {
    this.description = this.getDescription(this);
  }

}
