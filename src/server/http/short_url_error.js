import Boom from 'boom';

export function handleShortUrlError(error) {
  return Boom.boomify(error, {
    statusCode: error.statusCode || error.status || 500
  });
}
