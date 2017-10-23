export const timefilterControl = () => ({
  name: 'timefilterControl',
  displayName: 'Time Filter',
  modelArgs: [],
  args: [{
    name: 'column',
    displayName: 'Column',
    help: 'Column to which selected time is applied',
    argType: 'string',
    options: {
      confirm: 'Set',
    },
  }],
});
