import { setFullscreen } from '../../lib/fullscreen';
import { setFullscreen as setFullscreenAction } from '../actions/transient';
import { getFullscreen } from '../selectors/app';

export const fullscreen = ({ getState }) => next => action => {
  // execute the default action
  next(action);

  // pass current state's fullscreen info to the fullscreen service
  if (action.type === setFullscreenAction.toString()) {
    const fullscreen = getFullscreen(getState());
    setFullscreen(fullscreen);
  }
};
