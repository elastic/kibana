const _ = require('lodash');

export default [
  { // set
    typeId: 'set',
    title: 'Set',
    targetField: '',
    getDefinition: function (processor) {
      return {
        'set' : {
          'tag': processor.processorId,
          'field' : processor.targetField ? processor.targetField : '',
          'value': processor.value ? processor.value : ''
        }
      };
    },
    getDescription: function (processor) {
      const target = (processor.targetField) ? processor.targetField : '?';
      return `[${target}]`;
    }
  }
];
