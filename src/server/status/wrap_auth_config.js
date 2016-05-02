import {assign, identity} from 'lodash';

export default (disableAuth) => {
  if (disableAuth) return options => assign(options, {config: {auth: false}});
  return identity;
};
