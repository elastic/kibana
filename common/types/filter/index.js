export const filter = {
  name: 'filter',
  from: {
    null: () => {
      return {
        type: 'filter',
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
  to: {
    render: (value) => ({
      type: 'render',
      as: 'debug',
      value,
    }),
  },
};
