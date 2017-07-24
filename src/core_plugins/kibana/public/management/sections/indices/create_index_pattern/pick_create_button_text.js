export function pickCreateButtonText($translate, state) {
  const {
    loading,
    invalidIndexName,
    timeFieldOption
  } = state;

  if (loading) {
    return 'Loading';
  }

  if (invalidIndexName) {
    return 'Invalid index name pattern.';
  }

  if (!timeFieldOption) {
    return 'Time Filter field name is required';
  }

  return 'Create';
}
