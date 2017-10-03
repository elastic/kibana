import Type from '../type';

export default new Type({
  name: 'location',
  from: {},
  to: {
    'string': (value) => `${value.latitude},${value.longitude}`,
  },
});
