export const debug = () => ({
  name: 'debug',
  displayName: 'Debug',
  help: 'Just dumps the configuration of the element',
  image: 'alert',
  expression: `demodata
| render as=debug`,
});
