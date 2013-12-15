var global = window;

module("Autocomplete", {
   setup: function () {
      if (!global.sense)
         global.sense = {};
      var sense = global.sense;
      sense.tests = {};
   },

   teardown: function () {
      sense.tests = {};
   }
});
