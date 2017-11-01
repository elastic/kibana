export function debug(name) {
  return {
    next(v) {
      console.log('N: %s %s', name, v);
    },
    error(error) {
      console.log('E: %s', name, error);
    },
    complete() {
      console.log('C: %s', name);
    }
  };
}
