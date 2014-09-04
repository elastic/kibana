define(function () {
  return function ReplaceIndexUtilService() {
    /*
     * Replaces an object in an array at a specific index
     *
     * Accepts an array of objects
     * an index (num)
     * and an obj
     */
    return function (arr, index, obj) {
      arr.splice(index, 1);
      arr.splice(index, 0, obj);

      // Returns an array with a replaced object
      return arr;
    };
  };
});
