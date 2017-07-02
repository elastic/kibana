const separator = '.';

export function ensureDeepObject(obj: any) {
  if (obj == null || typeof obj !== 'object') {
    return obj;
  }

  const fullObject = {} as any;
  Object.keys(obj).forEach(k => {
    if (!k.includes(separator)) {
      fullObject[k] = ensureDeepObject(obj[k]);
    } else {
      walk(fullObject, k.split(separator), obj[k]);
    }
  });
  return fullObject;
}

function walk(obj: any, keys: string[], value: any) {
  const key = keys.shift()!;
  if (keys.length === 0) {
    obj[key] = value;
  } else {
    if (obj[key] === undefined) {
      obj[key] = {}
    }
    walk(obj[key], keys, ensureDeepObject(value));
  }
}