import { get } from 'lodash';

export function toJson(prop) {
  return (resp) => {
    return resp.json()
    .then(resp => {
      if (resp.ok === false) throw new Error(get(resp, 'resp.response', 'response was not ok'));
      if (prop) return get(resp, prop);
      return resp;
    });
  };
}