import { duplicatePage } from '../actions/pages';
import { fetchRenderable, fetchAllRenderables } from '../actions/elements';
import { setRefreshInterval } from '../actions/workpad';
import { getPages } from '../selectors/workpad';

let refreshInterval;

export const workpadUpdate = ({ dispatch, getState }) => next => (action) => {
  next(action);

  // This middleware fetches all of the renderable elements on new, duplicate page
  if (action.type === duplicatePage.toString()) {
    // When a page has been duplicated, it will be added as the last page, so fetch it
    const pages = getPages(getState());
    const newPage = pages[pages.length - 1];

    // For each element on that page, dispatch the action to update it
    return newPage.elements.forEach(element => dispatch(fetchRenderable(element)));
  }

  // This middleware creates or destroys an interval that will cause workpad elements to update
  if (action.type === setRefreshInterval.toString()) {
    // clear any existing interval
    clearInterval(refreshInterval);

    // if the new interval is not 0, start a new interval
    const interval = action.payload;
    if (interval > 0) {
      refreshInterval = setInterval(() => dispatch(fetchAllRenderables()), action.payload);
    }
  }
};
