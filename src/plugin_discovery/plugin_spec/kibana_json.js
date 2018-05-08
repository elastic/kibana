import { resolve } from 'path';
import { promisify } from 'util';
import fs from 'fs';

import stripJsonComments from 'strip-json-comments';
import Joi from 'joi';

import { createInvalidPluginError } from '../errors';
import { validate } from './lib';

const readFileAsync = promisify(fs.readFile);

const KibanaJsonSchema = Joi.object().keys({
  id: Joi.string().required(),
  version: Joi.string().required(),
  kibanaVersion: Joi.string().default(Joi.ref('version')),
  requiredPlugins: Joi.array().items(Joi.string()).default([]),
}).default();

async function read(pluginPath) {
  try {
    return await readFileAsync(resolve(pluginPath, 'kibana.json'), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createInvalidPluginError(null, pluginPath, `kibana.json file expected in ${pluginPath}`);
    }

    throw error;
  }
}

export async function parseKibanaJson(pluginPath) {
  const json = stripJsonComments(await read(pluginPath));

  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw createInvalidPluginError(null, pluginPath, `unable to load kibana.json file: ${error.message}`);
  }

  return validate(parsed && parsed.id, pluginPath, 'kibana.json', parsed, KibanaJsonSchema);
}
