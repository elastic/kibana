define(function (require) {
  function HastyRefresh() {
    this.name = 'HastyRefresh';
    this.message = 'Courier attempted to start a query before the previous had finished.';
  }
  HastyRefresh.prototype = new Error();
  HastyRefresh.prototype.constructor = HastyRefresh;

  return {
    HastyRefresh: HastyRefresh
  };
});