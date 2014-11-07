define(function (require) {
  return function HandlerTypeFactory(Private) {

    /**
     * Handles the building of each visualization
     *
     * @return {Function} Returns an Object of Handler types
     */
    return {
      histogram: Private(require('components/vislib/lib/handler/types/column')),
      line: Private(require('components/vislib/lib/handler/types/column')),
      pie: Private(require('components/vislib/lib/handler/types/pie')),
      area: Private(require('components/vislib/lib/handler/types/column')),
      tile_map: Private(require('components/vislib/lib/handler/types/tile_map'))
    };
  };
});
