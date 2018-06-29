import chrome from 'ui/chrome';
import { API_ROUTE_WORKPAD } from '../../common/lib/constants';
import { notify } from '../lib/notify';
import { fetch } from '../../common/lib/fetch';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_WORKPAD}`;

/*
 * The error data will be in `err.response` if the error comes from the server (example: 404)
 * The error object will be error data if it comes directly from the fetch library, (example: network error)
 */
const notifyError = source => {
  return err => {
    const errData = err.response || err;
    notify.error(source);
    notify.error(errData);
  };
};

export function create(workpad) {
  return fetch
    .post(apiPath, { ...workpad, assets: workpad.assets || {} })
    .catch(notifyError('Could not create workpad'));
}

export function get(workpadId) {
  return fetch
    .get(`${apiPath}/${workpadId}`)
    .then(res => res.data)
    .catch(notifyError('Could not get workpad'));
}

export function update(id, workpad) {
  return fetch.put(`${apiPath}/${id}`, workpad).catch(notifyError('Could not update workpad'));
}

export function remove(id) {
  return fetch.delete(`${apiPath}/${id}`).catch(notifyError('Could not remove workpad'));
}

export function find(searchTerm) {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(`${apiPath}/find?name=${validSearchTerm ? searchTerm : ''}`)
    .then(resp => resp.data)
    .catch(notifyError('Could not find workpads'));
}
