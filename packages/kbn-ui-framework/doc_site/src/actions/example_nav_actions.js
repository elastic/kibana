import ActionTypes from './action_types';

export const registerSection = (id, name) => ({
  type: ActionTypes.REGISTER_SECTION,
  id,
  name,
});

export const unregisterSection = id => ({
  type: ActionTypes.UNREGISTER_SECTION,
  id,
});
