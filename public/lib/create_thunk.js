export function createThunk(name, fn) {
  const actionCreator = (...args) => (dispatch, getState) => fn({ dispatch, getState }, ...args);
  actionCreator.toString = () => name.toString();
  return actionCreator;
}
