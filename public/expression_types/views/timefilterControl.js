export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: 'Time Filter',
  modelArgs: [],
  args: [{
    name: 'column',
    displayName: 'Column',
    description: 'Column to which selected time is applied',
    argType: 'string',
    options: {
      confirm: 'Set',
    },
  }],
});
