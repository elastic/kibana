export const plugin = {
  configPath: 'bar',
  dependencies: ['foo'],
  plugin: (kibana, deps) => {
    return {
      fromFoo: deps.foo.value,
      value: 'bar'
    };
  }
};
