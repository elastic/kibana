import Boom from 'boom';

export function handleShortUrlError(error) {
  if (!error.isBoom && !(error instanceof Error)) {
    return Boom.create(error.status || 500);
  }
  return Boom.wrap(error, error.status || 500);
}
