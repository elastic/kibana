export const image = () => ({
  name: 'image',
  to: {
    render: input => {
      return {
        type: 'render',
        as: 'image',
        value: input,
      };
    },
  },
});
