import { fetchAllRenderables } from './elements';

export const initializeWorkpad = () => (dispatch) => {
  dispatch(fetchAllRenderables());
};
