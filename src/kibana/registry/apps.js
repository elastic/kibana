define(function (require) {
  return require('registry/_registry')({
    name: 'apps',
    index: ['name'],
    order: ['order']
  });
});