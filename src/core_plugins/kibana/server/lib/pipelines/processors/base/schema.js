import _ from 'lodash';
import Joi from 'joi';
import processorArraySchema from '../../processor_array/schema';

export default Joi.object({
  processor_id: Joi.string().required(),
  failure_action: Joi.string().allow(''),
  failure_processors: processorArraySchema
});
