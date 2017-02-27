import { LOADING_STATUS } from './constants';


export function createInitialLoadingStatusState() {
  return {
    anchor: LOADING_STATUS.UNINITIALIZED,
    predecessors: LOADING_STATUS.UNINITIALIZED,
    successors: LOADING_STATUS.UNINITIALIZED,
  };
}
