const loggedErrors = new WeakSet();

export function markErrorLogged(error) {
  loggedErrors.add(error);
  return error;
}

export function isErrorLogged(error) {
  return loggedErrors.has(error);
}
