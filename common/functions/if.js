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
      resolve: false,
      help: 'The return value if true',
    },
    else: {
      resolve: false,
      help:
        'The return value if false. If else is not specified, and the condition is false' +
        'then the input context to the function will be returned',
    },
  },
  fn: async (context, args) => {
    if (args._) {
      if (typeof args.then === 'undefined') return context;
      return await args.then();
    } else {
      if (typeof args.else === 'undefined') return context;
      return await args.else();
    }
  },
});
