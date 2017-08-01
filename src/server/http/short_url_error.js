import Boom from 'boom';

export function handleShortUrlError(error) {
  return Boom.wrap(error, error.statusCode || error.status || 500);
}
