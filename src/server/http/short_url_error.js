import Boom from 'boom';

export function handleShortUrlError(error) {
  return Boom.wrap(error, error.status || 500);
}
