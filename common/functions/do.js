export const doFn = () => ({
  name: 'do',
  help:
    'Runs multiple sub-expressions. Returns the passed in context. Nice for running actions producing functions.',
  args: {
    _: {
      multi: true,
      help:
        'One or more sub-expressions. The value of these is not available in the root pipeline as this function simply returns the passed in context',
    },
  },
  fn: context => context,
});
