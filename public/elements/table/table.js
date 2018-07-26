export const table = () => ({
  name: 'table',
  displayName: 'Data Table',
  help: 'A scrollable grid for displaying data in a tabular format',
  image: 'editorTable',
  expression: `filters
| demodata
| table
| render`,
});
