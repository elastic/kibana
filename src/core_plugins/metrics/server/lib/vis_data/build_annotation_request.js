import buildProcessorFunction from './build_processor_function';
import processors from './request_processors/annotations';

export default function buildAnnotationRequest(req, panel, annotation) {
  const processor = buildProcessorFunction(processors, req, panel, annotation);
  const doc = processor({});
  return doc;
}
