define(function (require) {
  return function VisTypeService(Private) {
    var _ = require('lodash');
    var Registry = require('utils/registry/registry');

    return new Registry({
      index: ['name'],
      initialSet: [
        Private(require('components/vis_types/histogram')),
        Private(require('components/vis_types/line')),
        Private(require('components/vis_types/pie'))
      ]
    });
  };
});