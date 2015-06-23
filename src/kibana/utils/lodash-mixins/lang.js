define(function (require) {
  return function (_) {
    _.mixin(_, {


      /**
       * Checks to see if an input value is number-like, this
       * includes strings that parse into valid numbers and objects
       * that don't have a type of number but still parse properly
       * via-some sort of valueOf magic
       *
       * @param  {any} v - the value to check
       * @return {Boolean}
       */
      isNumeric: function (v) {
        return !_.isNaN(v) && (typeof v === 'number' || (!_.isArray(v) && !_.isNaN(parseFloat(v))));
      },

    });
  };
});
