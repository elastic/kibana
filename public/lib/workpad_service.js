import chrome from 'ui/chrome';
import { API_ROUTE_WORKPAD } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { get as _get } from 'lodash';

const basePath = chrome.getBasePath();
const apiPath = `${basePath}${API_ROUTE_WORKPAD}`;

export function create(workpad) {
  return fetch.post(apiPath, { ...workpad, assets: workpad.assets || {} });
}

export function get(workpadId) {
  return fetch.get(`${apiPath}/${workpadId}`).then(res => res.data);
}

export function update(id, workpad) {
  return fetch.put(`${apiPath}/${id}`, workpad);
}

export function remove(id) {
  return fetch.delete(`${apiPath}/${id}`);
}

export function find(searchTerm) {
  return fetch.get(`${apiPath}/find?name=${_get(searchTerm, 'length') ? searchTerm : '*'}`).then(resp => resp.data);
}
