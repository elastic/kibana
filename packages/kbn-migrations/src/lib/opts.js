const Joi = require('joi');

const migrationSchema = Joi.object({
  id: Joi.string().required(),
  seed: Joi.func(),
  filter: Joi.func(),
  transform: Joi.func(),
}).xor('seed', 'filter')
  .xor('seed', 'transform');

const pluginSchema = Joi.object({
  id: Joi.string().required(),
  mappings: Joi.object(),
  migrations: Joi.array().items(migrationSchema),
});

const documentSchema = Joi.object({
  id: Joi.string(),
  type: Joi.string().required(),
  attributes: Joi.any().required(),
});

const callClusterSchema = Joi.func();
const indexSchema = Joi.string();
const pluginArraySchema = Joi.array().items(pluginSchema);
const documentArraySchema = Joi.array().items(documentSchema);
const migrationStateSchema = Joi.object({
  status: Joi.string(),
  plugins: Joi.array().items(Joi.object({
    id: Joi.string().required(),
    mappings: Joi.string(),
    mappingsChecksum: Joi.string().required(),
    migrationIds: Joi.array().required().items(Joi.string()),
    migrationsChecksum: Joi.string().required(),
  })),
});

module.exports = {
  migrationSchema,
  pluginSchema,
  callClusterSchema,
  indexSchema,
  pluginArraySchema,
  documentArraySchema,
  migrationStateSchema,
};
