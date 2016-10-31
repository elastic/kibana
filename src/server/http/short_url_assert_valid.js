import { parse } from 'url';
import { trim } from 'lodash';
import Boom from 'boom';

export function shortUrlAssertValid(url) {
  const { protocol, hostname, pathname } = parse(url);

  if (protocol) {
    throw Boom.notAcceptable(`Short url targets cannot have a protocol, found "${protocol}"`);
  }

  if (hostname) {
    throw Boom.notAcceptable(`Short url targets cannot have a hostname, found "${hostname}"`);
  }

  const pathnameParts = trim(pathname, '/').split('/');
  if (pathnameParts.length !== 2) {
    throw Boom.notAcceptable(`Short url target path must be in the format "/app/{{appId}}", found "${pathname}"`);
  }
}
