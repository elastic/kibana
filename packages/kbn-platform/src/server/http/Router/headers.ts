import { pick } from '../../../lib/utils';

export interface Headers {
  [key: string]: string | string[];
}

const normalizeHeaderField = (field: string) => field.trim().toLowerCase();

export function filterHeaders(headers: Headers, fieldsToKeep: string[]) {
  // Normalize list of headers we want to allow in upstream request
  const fieldsToKeepNormalized = fieldsToKeep.map(normalizeHeaderField);

  return pick(headers, fieldsToKeepNormalized);
}
