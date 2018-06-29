import { Notifier } from 'ui/notify';

/*
 * TODO Make this use a toast error instead of a banner.
 * Toast should be able to give context about where the error originated,
 * not just show you the error data
 */
const kbnNotify = new Notifier({
  location: 'Canvas',
});

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
