import Joi from 'joi';
import indexPatternSchema from '../../index_pattern/schema';
import pipelineSchema from '../pipeline/schema';

module.exports = Joi.object({
  index_pattern: indexPatternSchema.required(),
  pipeline: pipelineSchema
});
