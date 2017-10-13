import { globals } from '../../globals';
import { createAction } from 'redux-actions';
import { createThunk } from 'redux-thunks';

import {
  getSearchPattern,
  getTimeField
} from '../reducers';

export const creatingIndexPattern = createAction('CREATING_INDEX_PATTERN');
export const createdIndexPattern = createAction('CREATED_INDEX_PATTERN');

export const createIndexPattern = createThunk('CREATE_INDEX_PATTERN',
  async ({ dispatch, getState }) => {
    const state = getState();
    const pattern = getSearchPattern(state);
    const timeFieldName = getTimeField(state);

    dispatch(creatingIndexPattern);
    const indexPattern = await globals.indexPatterns.get();
    Object.assign(indexPattern, {
      title: pattern,
      timeFieldName,
    });

    const createdId = await indexPattern.create();

    if (!globals.config.get('defaultIndex')) {
      globals.config.set('defaultIndex', createdId);
    }

    globals.indexPatterns.cache.clear(createdId);
    dispatch(createdIndexPattern);
    globals.kbnUrl.change(`/management/kibana/indices`);
    globals.$rootScope.$apply();
  }
);
