canvas.register(function() {
  console.log('Loading kibana/plugins Random function');
  return {
    name: 'random',
    help: 'Make a random number between 0 and 1',
    args: {},
    fn: () => Math.random(),
  };
});
