import buildProcessorFunction from '../build_processor_function';
import processors from '../request_processors/table';

function buildRequestBody(req, panel) {
  const processor = buildProcessorFunction(processors, req, panel);
  const doc = processor({});
  return doc;
}

export default buildRequestBody;
