import { getWorkpad } from '../selectors/workpad';
import { setWorkpad } from '../actions/workpad';
import { update } from '../../lib/workpad_service';

export const esPersistMiddleware = ({ getState }) => next => (action) => {
  const curState = getState();
  const workpad = getWorkpad(curState);

  next(action);

  const newWorkpad = getWorkpad(getState());

  // if the workpad changed, and wasn't just created, save it
  if (action.type !== setWorkpad.toString() && workpad !== newWorkpad) {
    const workpadId = newWorkpad.id;

    // TODO: do something better with errors here
    update(workpadId, newWorkpad).catch(err => console.error(err));
  }
};
