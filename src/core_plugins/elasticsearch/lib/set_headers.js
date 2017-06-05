import { isPlainObject } from 'lodash';

export default function setHeaders(originalHeaders, newHeaders) {
  if (!isPlainObject(originalHeaders)) {
    throw new Error(`Expected originalHeaders to be an object, but ${typeof originalHeaders} given`);
  }
  if (!isPlainObject(newHeaders)) {
    throw new Error(`Expected newHeaders to be an object, but ${typeof newHeaders} given`);
  }

  return {
    ...originalHeaders,
    ...newHeaders
  };
}
