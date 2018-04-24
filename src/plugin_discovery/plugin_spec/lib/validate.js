import { resolve } from 'path';

import { createInvalidPluginError } from '../../errors';

export function validate(id, pluginPath, name, toValidate, schema) {
  const { error, value } = schema.validate(toValidate, {
    abortEarly: false,
    context: {
      defaultPublicDir: resolve(pluginPath, 'public')
    }
  });

  if (error) {
    throw createInvalidPluginError(id, pluginPath, `${name} validation failure: ${error.message}`);
  }

  return value;
}
