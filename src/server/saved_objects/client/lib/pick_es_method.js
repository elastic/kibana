export function pickEsMethod(updateOnly, allowOverwrite, id) {
  if (updateOnly) return 'update';
  if (!allowOverwrite && id) return 'create';
  return 'index';
}
