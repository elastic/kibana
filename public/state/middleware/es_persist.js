import { fetch } from '../../../common/lib/fetch';
import { API_ROUTE_WORKPAD } from '../../../common/lib/constants';
import { getWorkpad } from '../selectors/workpad';
import { getBasePath } from '../selectors/app';

export const esPersistMiddleware = ({ getState }) => next => (action) => {
  const curState = getState();
  const workpad = getWorkpad(curState);
  const basePath = getBasePath(curState);

  next(action);

  const newWorkpad = getWorkpad(getState());

  // if the workpad changed, save it
  if (workpad !== newWorkpad) {
    const workpadId = newWorkpad.id;
    const apiRoute = `${basePath}${API_ROUTE_WORKPAD}/${workpadId}`;

    // TODO: do something better with errors here
    fetch.put(apiRoute, newWorkpad)
    .catch(err => console.error(err));
  }

};

