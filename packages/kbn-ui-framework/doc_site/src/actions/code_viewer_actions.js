import ActionTypes from './action_types';

export const openCodeViewer = (source, title) => ({
  type: ActionTypes.OPEN_CODE_VIEWER,
  source,
  title,
});

export const closeCodeViewer = () => ({
  type: ActionTypes.CLOSE_CODE_VIEWER,
});
