import { notify } from './notify';
/*
 * The error data will be in `err.response` if the error comes from the server (example: 404)
 * The error object will be error data if it comes directly from the fetch library, (example: network error)
 */
export const notifyError = source => {
  return err => {
    const errData = err.response || err;
    notify.error(source);
    notify.error(errData);
  };
};
