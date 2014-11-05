define(function (require) {
  return require('registry/_registry')('visTypes', {
    index: ['name'],
    order: ['order']
  });
});