import Joi from 'joi';
import ingestProcessorSchema from './resources/ingest_processor_schema';

export default Joi.object({
  processors: Joi.array().items(ingestProcessorSchema).required().min(1),
  input: Joi.object().required()
});
