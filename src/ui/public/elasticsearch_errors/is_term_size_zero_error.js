import ElasticsearchError from './elasticsearch_error';

export default function isTermSizeZeroError(error) {
  const esError = new ElasticsearchError(error);
  return esError.hasRootCause('size must be positive, got 0');
}
