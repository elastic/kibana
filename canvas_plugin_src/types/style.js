export const style = () => ({
  name: 'style',
  from: {
    null: () => {
      return {
        type: 'style',
        spec: {},
        css: '',
      };
    },
  },
});
