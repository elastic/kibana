import { fromByteArray } from 'base64-js';
import mime from 'mime/lite';

export const imageTypes = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];

export function parse(str, withData = false) {
  if (typeof str !== 'string') return;

  const reg = /^data:([a-z]+\/[a-z0-9-+.]+)(;[a-z-]+=[a-z0-9-]+)?;base64,/;
  const matches = str.match(reg);
  if (!matches) return;

  return {
    mimetype: matches[1],
    charset: matches[2] && matches[2].split('=')[1],
    data: !withData ? null : str.split(',')[1],
    isImage: imageTypes.indexOf(matches[1]) >= 0,
    extension: mime.getExtension(matches[1]),
  };
}

export function isValid(str) {
  return parse(str) != null;
}

export function encode(data, type = 'text/plain') {
  // use FileReader if it's available, like in the browser
  if (FileReader) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = err => reject(err);
      reader.readAsDataURL(data);
    });
  }

  // otherwise fall back to fromByteArray
  // note: Buffer doesn't seem to correctly base64 encode binary data
  return Promise.resolve(`data:${type};base64,${fromByteArray(data)}`);
}
