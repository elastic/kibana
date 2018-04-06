import { assign, identity } from 'lodash';

export const wrapAuthConfig = allowAnonymous => {
  if (allowAnonymous) {
    return options => assign(options, { config: { auth: false } });
  }
  return identity;
};
