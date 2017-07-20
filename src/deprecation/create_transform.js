import { deepCloneWithBuffers as clone } from '../utils';
import { forEach, noop } from 'lodash';

export function createTransform(deprecations) {
  return (settings, log = noop) => {
    const result = clone(settings);

    forEach(deprecations, (deprecation) => {
      deprecation(result, log);
    });

    return result;
  };
}
