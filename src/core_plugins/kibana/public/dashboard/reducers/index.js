import { combineReducers } from 'redux';
import {
  embeddables,
} from './embeddables';

import {
  panels,
} from './panels';

import {
  view,
} from './view';

export const dashboard = combineReducers({
  view,
  panels,
  embeddables,
});
