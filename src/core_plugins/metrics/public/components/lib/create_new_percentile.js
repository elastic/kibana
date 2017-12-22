import uuid from 'uuid';
export function createNewPercentile(opts) {
  return { id: uuid.v1(), mode: 'line', shade: 0.2, ...opts };
}
