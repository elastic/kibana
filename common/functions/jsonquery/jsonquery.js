import jsonQuery from 'json-query';
import { isArray, get } from 'lodash';

// TODO: Decide if we actually want to get data from table like this
// We need *some* way of accessing the data in tables, that could be via a collection of our own functions
// Or via something like this. I'm using JSON Query for the moment because it is easy, but we should make
// an actual decision, and replace this if needed.
export default {
  name: 'jsonquery',
  aliases: [],
  type: 'string',
  help: 'Retrieve a string from a datatable using JSON Query. (See https://github.com/mmckegg/json-query)',
  context: {
    types: [
      'datatable',
    ],
  },
  args: {
    _: {
      types: [
        'string',
      ],
      'aliases': ['q', 'query'],
      'multi': false,
      help: 'A JSON Query to run on the datatable rows.',
    },
  },
  fn: (context, args) => {
    const result = get(jsonQuery(args._, {
      data: context.rows,
    }), 'value');

    if (isArray(result)) return result.map(item => String(item)).join(', ');
    return String(result);
  },
};
