import _ from 'lodash';


function createReducerPipeline(...updaters) {
  return (state, action) => (
    _.flow(...updaters.map((updater) => (state) => updater(state, action)))(state)
  );
}

function scopeReducer(key, reducer) {
  return (state, action) => {
    const subState = state[key];
    const newSubState = reducer(subState, action);

    if (subState !== newSubState) {
      return { ...state, [key] : newSubState };
    }

    return state;
  };
}


export {
  createReducerPipeline,
  scopeReducer,
};
