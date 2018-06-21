import { notify as kbnNotify } from 'ui/notify';

export const notify = {
  /*
   * @param {Object} err: Error object
   * @param {Object} opts: option to override notification icon
   */
  error(err, opts = {}) {
    kbnNotify.error(err, opts);
  },
  warning(msg, opts = {}) {
    kbnNotify.warning(msg, opts);
  },
  info(msg, opts = {}) {
    kbnNotify.info(msg, opts);
  },
};
