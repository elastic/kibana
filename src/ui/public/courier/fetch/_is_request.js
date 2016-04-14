define(function (require) {
  return function CourierFetchIsRequestProvider(Private) {
    let AbstractRequest = Private(require('ui/courier/fetch/request/request'));

    return function isRequest(obj) {
      return obj instanceof AbstractRequest;
    };
  };
});
