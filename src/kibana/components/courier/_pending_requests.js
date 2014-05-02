define(function (require) {
  return function PendingRequestList() {
    /**
     * Queue of pending requests, requests are removed as
     * they are processed by fetch.[sourceType]().
     * @type {Array}
     */
    return [];
  };
});