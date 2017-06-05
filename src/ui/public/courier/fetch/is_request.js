import { AbstractRequestProvider } from './request';

export function IsRequestProvider(Private) {
  const AbstractRequest = Private(AbstractRequestProvider);

  return function isRequest(obj) {
    return obj instanceof AbstractRequest;
  };
}
