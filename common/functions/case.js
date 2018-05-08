export const caseFn = () => ({
  name: 'case',
  type: 'case',
  help: 'Build a condition to pass to the switch function',
  args: {
    _: {
      help:
        'When the `if` argument is not provided, the context is compared with this value to see if the condition is met',
    },
    if: {
      types: ['boolean'],
      help: 'When provided, this value is used as whether or not the condition is met',
    },
    then: {
      help: 'The value to return if the condition is met',
    },
  },
  fn: (context, args) => {
    return {
      type: 'case',
      matches: doesMatch(context, args),
      result: getResult(context, args),
    };
  },
});

function doesMatch(context, args) {
  if (typeof args.if !== 'undefined') return args.if;
  if (typeof args._ !== 'undefined') return args._ === context;
  return true;
}

function getResult(context, args) {
  if (typeof args.then !== 'undefined') return args.then;
  return context;
}
