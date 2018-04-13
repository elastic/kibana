import { isArray, isPlainObject, forOwn, set, transform, isString } from 'lodash';
import { readFileSync as read } from 'fs';
import { safeLoad } from 'js-yaml';

function replaceEnvVarRefs(val) {
  return val.replace(/\$\{(\w+)\}/g, (match, envVarName) => {
    if (process.env[envVarName] !== undefined) {
      return process.env[envVarName];
    } else {
      throw new Error(`Unknown environment variable referenced in config : ${envVarName}`);
    }
  });
}

export function merge(sources) {
  return transform(sources, (merged, source) => {
    forOwn(source, function apply(val, key) {
      if (isPlainObject(val)) {
        forOwn(val, function (subVal, subKey) {
          apply(subVal, key + '.' + subKey);
        });
        return;
      }

      if (isArray(val)) {
        set(merged, key, []);
        val.forEach((subVal, i) => apply(subVal, key + '.' + i));
        return;
      }

      if (isString(val)) {
        val = replaceEnvVarRefs(val);
      }

      set(merged, key, val);
    });
  }, {});
}

export function readYamlConfig(paths) {
  const files = [].concat(paths || []);
  const yamls = files.map(path => safeLoad(read(path, 'utf8')));
  return merge(yamls);
}
