import _ from 'lodash';

export default function (originalHeaders, headersToKeep) {
  const normalizeHeader = function (header) {
    if (!header) {
      return '';
    }
    header = header.toString();
    return header.trim().toLowerCase();
  };

  // Normalize list of headers we want to allow in upstream request
  const headersToKeepNormalized = headersToKeep.map(normalizeHeader);

  return _.pick(originalHeaders, headersToKeepNormalized);
}
