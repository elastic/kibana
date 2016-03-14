export const set = {
  typeId: 'set',
  title: 'Set',
  targetField: '',
  value: '',
  getDescription: function (processor) {
    const target = (processor.targetField) ? processor.targetField : '?';
    return `[${target}]`;
  }
};
