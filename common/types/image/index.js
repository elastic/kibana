const Type = require('../type');

module.exports = new Type({
  name: 'image',
  to: {
    render: (input) => {
      return {
        type: 'render',
        as: 'image',
        value: input,
      };
    },
  },
});
