import chrome from 'ui/chrome';
import { API_ROUTE } from '../../common/lib/constants';
import { fetch } from '../../common/lib/fetch';
import { notifyError } from './notify_error';

const basePath = chrome.getBasePath();
const apiPath = basePath + API_ROUTE;

export const getFields = (index = '_all') => {
  return fetch
    .get(`${apiPath}/es_fields?index=${index}`)
    .then(({ data: mapping }) => Object.keys(mapping).sort())
    .catch(notifyError('Could not fetch Elasticsearch fields'));
};

export const getIndices = () => {
  return fetch
    .get(`${apiPath}/es_indices`)
    .then(({ data: indices }) => indices)
    .catch(notifyError('Could not fetch Elasticsearch indices'));
};
