import Type from '../type';

export default new Type({
  name: 'query',
  from: {
    null: () => {
      return {
        type: 'query',
        // Any meta data you wish to pass along.
        meta: {},
        // Row limiting
        size: null,
        // Ordered sortings. {field, direction:[asc,desc]}
        sort: [],
        // And filters. If you need an "or", create a filter type for it.
        and: [],
      };
    },
  },
  to: {},
});
