import { pick } from '../../../utils';

export interface Headers {
  [key: string]: string | string[] | undefined;
}

const normalizeHeaderField = (field: string) => field.trim().toLowerCase();

export function filterHeaders(headers: Headers, fieldsToKeep: string[]) {
  // Normalize list of headers we want to allow in upstream request
  const fieldsToKeepNormalized = fieldsToKeep.map(normalizeHeaderField);

  return pick(headers, fieldsToKeepNormalized);
}
