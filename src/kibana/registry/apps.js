define(function (require) {
  return require('registry/_registry')('apps', {
    index: ['name'],
    order: ['order']
  });
});