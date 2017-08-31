import { createAction } from 'redux-actions';

export const createAsset = createAction('createAsset', (type, value, id) => ({ type, value, id }));
export const setAssetValue = createAction('setAssetContent', (id, value) => ({ id, value }));
export const removeAsset = createAction('removeAsset');
export const setAssets = createAction('setAssets');
export const resetAssets = createAction('resetAssets');
