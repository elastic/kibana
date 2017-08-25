import { setFilter } from '../../../state/actions/elements';

export function createHandlers(element, pageId, dispatch) {
  return {
    setFilter(text) {
      dispatch(setFilter(text, element.id, pageId, true));
    },

    getFilter() {
      return element.filter;
    },
  };
}
