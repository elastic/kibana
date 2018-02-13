export function getFieldNames(names, arg) {
  if (arg.args != null) {
    return names.concat(arg.args.reduce(getFieldNames, []));
  }

  if (typeof arg === 'string') {
    return names.concat(arg);
  }

  return names;
}
