define(function (require) {
  return require('registry/_registry')({
    name: 'visTypes',
    index: ['name'],
    order: ['order']
  });
});