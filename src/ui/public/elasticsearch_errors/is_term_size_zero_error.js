import { hasRootCause } from './elasticsearch_error';

export default function isTermSizeZeroError(error) {
  return hasRootCause(error, 'size must be positive, got 0');
}
