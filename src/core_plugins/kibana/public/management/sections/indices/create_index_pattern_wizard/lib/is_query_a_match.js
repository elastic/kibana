export const isQueryAMatch = (query, name) => {
  if (name === query) {
    return true;
  }

  const regexQuery = query
    .replace(/[*]/g, '.*')
    .replace(/[+]/g, '\\+');

  // This shouldn't be necessary but just used as a safety net
  // so the page doesn't bust if the user types in some weird
  // query that throws an exception when converting to a RegExp
  try {
    const regex = new RegExp(regexQuery);
    if (regex.test(name) && (query.endsWith('*') || query.length === name.length)) {
      return true;
    }
  }
  catch (e) {
    return false;
  }

  return false;
};
