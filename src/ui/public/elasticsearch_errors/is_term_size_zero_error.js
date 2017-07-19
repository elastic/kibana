import { ElasticsearchError } from './elasticsearch_error';

export function isTermSizeZeroError(error) {
  return ElasticsearchError.hasRootCause(error, 'size must be positive, got 0');
}
