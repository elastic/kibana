import buildProcessorFunction from '../build_processor_function';
import processors from '../request_processors/table';

function buildRequestBody(...args) {
  const processor = buildProcessorFunction(processors, ...args);
  const doc = processor({});
  return doc;
}

export default buildRequestBody;
