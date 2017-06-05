import buildProcessorFunction from './build_processor_function';
import processors from './request_processors/series';

function buildRequestBody(req, panel, series) {
  const processor = buildProcessorFunction(processors, req, panel, series);
  const doc = processor({});
  return doc;
}

export default buildRequestBody;
