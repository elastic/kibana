import { mapValues } from 'lodash';

export const functionWrapper = fnSpec => {
  const spec = fnSpec();
  const defaultArgs = mapValues(spec.args, argSpec => {
    return argSpec.default;
  });

  return (context, args, handlers) => spec.fn(context, { ...defaultArgs, ...args }, handlers);
};
