import fetch from 'axios';
import { encode, imageTypes } from './dataurl';

export const fetchRawImage = (url) => {
  const responseType = (FileReader) ? 'blob' : 'arraybuffer';

  return fetch(url, {
    method: 'GET',
    responseType,
  })
    .then((res) => {
      const type = res.headers['content-type'];

      if (imageTypes.indexOf(type) < 0) {
        return Promise.reject(new Error(`Invalid image type: ${type}`));
      }

      return { data: res.data, type };
    });
};

export const fetchImage = (url) => {
  return fetchRawImage(url).then(res => encode(res.data, res.type));
};
