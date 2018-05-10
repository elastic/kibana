export const ifFn = () => ({
  name: 'if',
  help: 'Perform conditional logic',
  args: {
    _: {
      types: ['boolean', 'null'],
      aliases: ['condition'],
      help:
        'A boolean true or false, usually returned by a subexpression. If this is not supplied then the input context will be used',
    },
    then: {
      help: 'The return value if true',
    },
    else: {
      help:
        'The return value if false. If else is not specified, and the condition is false' +
        'then the input context to the function will be returned',
    },
  },
  fn: (context, args) => {
    const then = typeof args.then !== 'undefined' ? args.then : context;
    if (args._) return then;
    if (typeof args.else !== 'undefined') return args.else;
    return context;
  },
});
