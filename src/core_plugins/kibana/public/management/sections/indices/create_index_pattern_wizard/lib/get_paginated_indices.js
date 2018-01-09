export function getPaginatedIndices(indices, page, perPage) {
  return indices.slice(page * perPage, Math.min(page * perPage + perPage, indices.length));
}
