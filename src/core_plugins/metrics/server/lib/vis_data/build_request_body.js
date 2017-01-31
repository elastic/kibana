import buildProcessorFunction from './build_processor_function';
import processors from './request_processors';

function buildRequestBody(req, panel, series) {
  const processor = buildProcessorFunction(processors, req, panel, series);
  const doc = processor({});
  return processor({});
}

export default buildRequestBody;
