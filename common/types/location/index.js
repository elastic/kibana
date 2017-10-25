export const location = {
  name: 'location',
  from: {},
  to: {
    'string': (value) => `${value.latitude},${value.longitude}`,
  },
};
