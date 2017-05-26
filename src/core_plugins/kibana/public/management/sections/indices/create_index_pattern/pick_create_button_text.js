export function pickCreateButtonText($translate, state) {
  const {
    loading,
    invalidIndexName,
    timeFieldOption
  } = state;

  if (loading) {
    return $translate.instant('KIBANA-LOADING');
  }

  if (invalidIndexName) {
    return $translate.instant('KIBANA-INVALID_INDEX_PATTERN');
  }

  if (!timeFieldOption) {
    return $translate.instant('KIBANA-FIELD_IS_REQUIRED', {
      fieldName: $translate.instant('KIBANA-TIME_FILTER_FIELD_NAME')
    });
  }

  return $translate.instant('KIBANA-CREATE');
}
