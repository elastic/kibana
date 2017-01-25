import { deepCloneWithBuffers as clone } from '../utils';
import { forEach, noop } from 'lodash';

export default function (deprecations) {
  return (settings, log = noop) => {
    const result = clone(settings);

    forEach(deprecations, (deprecation) => {
      deprecation(result, log);
    });

    return result;
  };
}
