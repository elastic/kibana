import _ from 'lodash';
import Joi from 'joi';
import * as ingestProcessorSchemas from '../../processors/schemas';

module.exports = Joi.array().items(_.values(ingestProcessorSchemas));
