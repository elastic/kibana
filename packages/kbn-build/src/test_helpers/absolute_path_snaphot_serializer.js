import { resolve, sep as pathSep } from 'path';
import cloneDeepWith from 'lodash.clonedeepwith';

const repoRoot = resolve(__dirname, '../../../../');

const normalizePaths = value => {
  let didReplacement = false;
  const clone = cloneDeepWith(value, v => {
    if (typeof v === 'string' && v.startsWith(repoRoot)) {
      didReplacement = true;
      return v
        .replace(repoRoot, '<repoRoot>')
        .split(pathSep) // normalize path separators
        .join('/');
    }
  });

  return {
    didReplacement,
    clone,
  };
};

export const absolutePathSnaphotSerializer = {
  print: (value, serialize) => {
    return serialize(normalizePaths(value).clone);
  },

  test: value => {
    return normalizePaths(value).didReplacement;
  },
};
