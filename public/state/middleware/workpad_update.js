import { duplicatePage } from '../actions/pages';
import { fetchRenderable } from '../actions/elements';
import { getPages } from '../selectors/workpad';

export const workpadUpdate = ({ dispatch, getState }) => next => (action) => {
  next(action);

  if (action.type === duplicatePage.toString()) {
    const pages = getPages(getState());
    const newPage = pages[pages.length - 1];

    return newPage.elements.forEach(element => dispatch(fetchRenderable(element)));
  }
};
