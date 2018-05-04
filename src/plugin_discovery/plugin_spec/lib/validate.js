import { createInvalidPluginError } from '../../errors';

export function validate(id, pluginPath, name, toValidate, schema) {
  const { error, value } = schema.validate(toValidate, {
    abortEarly: false,
  });

  if (error) {
    throw createInvalidPluginError(id, pluginPath, `${name} validation failure: ${error.message}`);
  }

  return value;
}
