import { notify as kbnNotify } from 'ui/notify';

export const notify = {
  error(msg, opts = {}) {
    kbnNotify.error(msg, opts);
  },
  warning(msg, opts = {}) {
    kbnNotify.warning(msg, opts);
  },
  info(msg, opts = {}) {
    kbnNotify.info(msg, opts);
  },
};
