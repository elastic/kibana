define(function () {
  return function ZeroFilledArrayUtilService() {
    // Accepts an array of strings or numbers
    // and a kibana data.ordered object
    return function (arr) {
      var max = arr.length;
      var i;
      var val;
      var zeroFilledArray = [];

      for (i = 0; i < max; i++) {
        val = arr[i];

        zeroFilledArray.push({
          x: val,
          y: 0
        });
      }

      // Returns an array of objects with y value of 0
      return zeroFilledArray;
    };
  };
});
