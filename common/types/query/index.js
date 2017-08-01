import Type from '../type';

export default new Type({
  name: 'query',
  from: {
    null: () => {
      return {
        type: 'query',
        meta: null,
        size: null,
        sort: null,
        and: [],
      };
    },
  },
  to: {},
});
