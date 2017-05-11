export function disableFilter(filter) {
  return setFilterDisabled(filter, true);
}

export function enableFilter(filter) {
  return setFilterDisabled(filter, false);
}

export function toggleFilterDisabled(filter) {
  const { meta: { disabled = false } = {} } = filter;

  return setFilterDisabled(filter, !disabled);
}

function setFilterDisabled(filter, disabled) {
  const { meta = {} } = filter;

  return {
    ...filter,
    meta: {
      ...meta,
      disabled,
    }
  };
}
