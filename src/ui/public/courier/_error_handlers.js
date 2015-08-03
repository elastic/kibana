define(function (require) {
  return function ErrorHandlerList() {
    /**
     * Queue of pending error handlers, they are removed as
     * they are resolved.
     * @type {Array}
     */
    return [];
  };
});
