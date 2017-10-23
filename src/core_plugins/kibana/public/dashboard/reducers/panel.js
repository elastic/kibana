import { handleActions } from 'redux-actions';
import _ from 'lodash';

import {
  updatePanel,
} from '../actions';

export const panel = handleActions({
  [updatePanel]: (state, { payload }) => _.defaultsDeep(payload, state),
}, {
  panelIndex: undefined,
  id: undefined,
  type: undefined,
  version: undefined,
  gridData: {}
});

export const getPanelType = state => state.type;
