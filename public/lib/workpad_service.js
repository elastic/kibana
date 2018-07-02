import chrome from 'ui/chrome';
import { API_ROUTE_WORKPAD } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { notifyError } from './notify_error';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_WORKPAD}`;

export function create(workpad) {
  return fetch
    .post(apiPath, { ...workpad, assets: workpad.assets || {} })
    .catch(notifyError('Could not create workpad'));
}

export function get(workpadId) {
  return fetch
    .get(`${apiPath}/${workpadId}`)
    .then(({ data: workpad }) => workpad)
    .catch(notifyError(`Could not get workpad by ID: ${workpadId}`));
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
    .then(({ data: workpads }) => workpads)
    .catch(notifyError('Could not find workpads'));
}
