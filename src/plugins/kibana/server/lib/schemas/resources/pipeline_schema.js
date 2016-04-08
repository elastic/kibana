import _ from 'lodash';
import Joi from 'joi';
import * as ingestProcessorSchemas from './ingest_processor_schemas';

module.exports = Joi.array().items(_.values(ingestProcessorSchemas));
