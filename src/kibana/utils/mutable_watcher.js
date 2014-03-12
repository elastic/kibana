define(function (require) {

  /**
   * Helper to create a watcher than can be simply changed
   * @param {[type]} opts      [description]
   * @param {[type]} initialFn [description]
   */
  function MutableWatcher(opts, initialFn) {
    opts = opts || {};

    var $scope = opts.$scope;
    if (!$scope) throw new TypeError('you must specify a scope.');

    var expression = opts.expression;
    if (!expression) throw new TypeError('you must specify an expression.');

    // the watch method to call
    var method = $scope[opts.type === 'collection' ? '$watchCollection' : '$watch'];

    // stores the unwatch function
    var unwatcher;

    // change the function that the watcher triggers
    function watch(watcher) {
      if (typeof unwatcher === 'function') {
        unwatcher();
        unwatcher = null;
      }

      if (!watcher) return;

      // include the expression as the first argument
      var args = [].slice.apply(arguments);
      args.unshift(expression);

      // register a new unwatcher
      unwatcher = method.apply($scope, args);
    }

    watch(initialFn);

    // public API
    this.set = watch;
  }

  return MutableWatcher;

});