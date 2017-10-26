export const ifFn = {
  name: 'if',
  help: 'Perform conditional logic',
  args: {
    _: {
      types: [
        'boolean',
        'null',
      ],
      'aliases': ['condition'],
      help: 'A boolean true or false, usually returned by a subexpression. If this is not supplied then the input context will be used',
    },
    then: {
      help: 'The return value if true',
    },
    else: {
      help: 'The return value if false. If else is not specified, and the condition is false' +
            'then the input context to the function will be returned',
    },
    // TODO: When we add "action" functions, this could be used a perform an action without
    passthru: {
      help: 'Instead of returning the value of then, simply execute it and pass the input context through',
      default: false,
    },
  },
  fn: (context, args) => {
    if (typeof args._ === 'undefined') {
      if (args._) return args.then;
      if (typeof args.else !== 'undefined') return args.else;
    } else {
      if (args._) return args.then;
      if (typeof args.else !== 'undefined') return args.else;
    }
    return context;
  },
};
