import { isEqual } from 'lodash';
import { getWorkpad, getWorkpadPersisted } from '../selectors/workpad';
import { getAssetIds } from '../selectors/assets';
import { setWorkpad } from '../actions/workpad';
import { setAssets } from '../actions/assets';
import { update } from '../../lib/workpad_service';
import { notify } from '../../lib/notify';

const workpadChanged = (before, after) => {
  const workpad = getWorkpad(before);
  return getWorkpad(after) !== workpad;
};

const assetsChanged = (before, after) => {
  const assets = getAssetIds(before);
  return !isEqual(assets, getAssetIds(after));
};

const skippedActions = [setWorkpad.toString(), setAssets.toString()];

export const esPersistMiddleware = ({ getState }) => next => action => {
  // if the workpad was just loaded, don't save it
  if (skippedActions.indexOf(action.type) >= 0) return next(action);

  // capture state before and after the action
  const curState = getState();
  next(action);
  const newState = getState();

  // if the workpad changed, save it to elasticsearch
  if (workpadChanged(curState, newState) || assetsChanged(curState, newState)) {
    const persistedWorkpad = getWorkpadPersisted(getState());
    return update(persistedWorkpad.id, persistedWorkpad).catch(err => {
      if (err.response.status === 400) {
        const respErr = err.response;
        respErr.data.message = `Could not save your changes to Elasticsearch: ${
          respErr.data.message
        }`;
        return notify.error(respErr);
      }

      return notify.error(err.response);
    });
  }
};
