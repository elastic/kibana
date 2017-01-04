import { assign } from 'lodash';
import Processor from 'ui/pipelines/processor/view_model';

export default class Sort extends Processor {
  constructor(processorRegistry, processorId, model) {
    super(
      processorRegistry,
      processorId,
      'sort',
      'Sort',
      `Sorts the elements of an array ascending or descending. Homogeneous arrays
of numbers will be sorted numerically, while arrays of strings or heterogeneous
arrays of strings + numbers will be sorted lexicographically.`,
      'targetField',
      {
        targetField: '',
        sortOrder: 'asc'
      },
      model
    );
  }

  get description() {
    const sortOrders = {
      asc: 'Ascending',
      desc: 'Descending'
    };
    const target = this.targetField || '?';
    return `[${target}] ${sortOrders[this.sortOrder]}`;
  }

  get model() {
    return assign(
      super.model,
      {
        targetField: this.targetField || '',
        sortOrder: this.sortOrder || ''
      }
    );
  }
};
