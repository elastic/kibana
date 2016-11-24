import Boom from 'boom';

export function handleShortUrlError(err) {
  if (err.isBoom) return err;
  if (err.status === 401) return Boom.unauthorized();
  if (err.status === 403) return Boom.forbidden();
  if (err.status === 404) return Boom.notFound();
  return Boom.badImplementation();
}
