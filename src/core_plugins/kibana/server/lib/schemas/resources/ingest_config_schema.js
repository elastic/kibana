import Joi from 'joi';
import indexPatternSchema from './index_pattern_schema';

module.exports = Joi.object({
  index_pattern: indexPatternSchema.required()
});
