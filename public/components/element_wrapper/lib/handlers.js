export function createHandlers(element, dispatch) {
  return {
    setFilter() {
      console.log(dispatch);
    },

    getFilter() {
      console.log(element);
    },
  };
}
