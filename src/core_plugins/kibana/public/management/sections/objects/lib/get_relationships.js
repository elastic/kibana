import { get } from 'lodash';

export async function getRelationships(type, id, $http, basePath) {
  const url = `${basePath}/api/kibana/management/saved_objects/relationships/${type}/${id}`;
  const options = {
    method: 'GET',
    url,
  };

  try {
    const response = await $http(options);
    return response ? response.data : undefined;
  }
  catch (resp) {
    const respBody = get(resp, 'data', {});
    const err = new Error(respBody.message || respBody.error || `${resp.status} Response`);

    err.statusCode = respBody.statusCode || resp.status;
    err.body = respBody;

    throw err;
  }
}
