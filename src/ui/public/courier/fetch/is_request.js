import AbstractRequestProvider from './request';

export default function IsRequestProvider(Private) {
  var AbstractRequest = Private(AbstractRequestProvider);

  return function isRequest(obj) {
    return obj instanceof AbstractRequest;
  };
};
