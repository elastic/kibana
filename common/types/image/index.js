const Type = require('../type');

module.exports = new Type({
  name: 'dataurl',
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
