define(function (require) {
  return function CourierFetchIsRequestProvider(Private) {
    var AbstractRequest = Private(require('ui/courier/fetch/request/request'));

    return function isRequest(obj) {
      return obj instanceof AbstractRequest;
    };
  };
});
