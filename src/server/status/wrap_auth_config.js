import { assign, identity } from 'lodash';

export default (allowAnonymous) => {
  if (allowAnonymous) return options => assign(options, { config: { auth: false } });
  return identity;
};
