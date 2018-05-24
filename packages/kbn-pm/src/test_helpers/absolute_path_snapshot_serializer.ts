import cloneDeepWith from 'lodash.clonedeepwith';
import { resolve, sep as pathSep } from 'path';

const repoRoot = resolve(__dirname, '../../../../');

const normalizePaths = (value: any) => {
  let didReplacement = false;
  const clone = cloneDeepWith(value, (v: any) => {
    if (typeof v === 'string' && v.startsWith(repoRoot)) {
      didReplacement = true;
      return v
        .replace(repoRoot, '<repoRoot>')
        .split(pathSep) // normalize path separators
        .join('/');
    }
  });

  return {
    clone,
    didReplacement,
  };
};

export const absolutePathSnapshotSerializer = {
  print(value: any, serialize: (val: any) => string) {
    return serialize(normalizePaths(value).clone);
  },

  test(value: any) {
    return normalizePaths(value).didReplacement;
  },
};
