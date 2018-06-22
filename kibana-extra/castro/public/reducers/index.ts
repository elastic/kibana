import { handleActions, combineActions } from 'redux-actions';
import { increase, decrease } from '../actions';

export interface RootState {
  count: number
};

const defaultState: RootState = {
  count: 0
};

const reducer = handleActions({
  [increase]: (state: RootState, action: any) => {
    console.log("Receive increase action with payload: " + action.payload);
    return {
      count: state.count + action.payload
    };
  },
  [decrease]: (state: RootState, action: any) => {
    console.log("Receive decrease action with payload: " + action.payload);
    return {
      count: state.count - action.payload
    };
  }
}, defaultState);

export default reducer;

