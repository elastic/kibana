import chrome from 'ui/chrome';
import { API_ROUTE_WORKPAD } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { notify } from './notify';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_WORKPAD}`;

export function create(workpad) {
  return fetch
    .post(apiPath, { ...workpad, assets: workpad.assets || {} })
    .catch(err => notify.error(err, { title: `Couldn't create workpad` }));
}

export function get(workpadId) {
  return fetch
    .get(`${apiPath}/${workpadId}`)
    .then(({ data: workpad }) => workpad)
    .catch(err => notify.error(err, { title: `Couldn't get workpad by ID` }));
}

export function update(id, workpad) {
  return fetch
    .put(`${apiPath}/${id}`, workpad)
    .catch(err => notify.error(err, { title: `Couldn't update workpad` }));
}

export function remove(id) {
  return fetch
    .delete(`${apiPath}/${id}`)
    .catch(err => notify.error(err, { title: `Couldn't remove workpad` }));
}

export function find(searchTerm) {
  const validSearchTerm = typeof searchTerm === 'string' && searchTerm.length > 0;

  return fetch
    .get(`${apiPath}/find?name=${validSearchTerm ? searchTerm : ''}&perPage=10000`)
    .then(({ data: workpads }) => workpads)
    .catch(err => notify.error(err, { title: `Couldn't find workpads` }));
}
