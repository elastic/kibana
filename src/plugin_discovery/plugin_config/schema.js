import Joi from 'joi';

const STUB_CONFIG_SCHEMA = Joi.object().keys({
  enabled: Joi.valid(false).default(false)
}).default();

const DEFAULT_CONFIG_SCHEMA = Joi.object().keys({
  enabled: Joi.boolean().default(true)
}).default();


/**
 *  Get the config schema for a plugin spec
 *  @param  {PluginSpec} spec
 *  @return {Promise<Joi>}
 */
export async function getSchema(spec) {
  const provider = spec.getConfigSchemaProvider();
  return (provider && await provider(Joi)) || DEFAULT_CONFIG_SCHEMA;
}

export function getStubSchema() {
  return STUB_CONFIG_SCHEMA;
}
