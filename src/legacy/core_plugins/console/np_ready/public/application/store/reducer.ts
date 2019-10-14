/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Reducer } from 'react';
import { instance as registry } from './editor_registry';
import { Store } from './store';
import { RecipeAttributes } from '../models/recipe';
import { DevToolsSettings } from '../../services';

export type Action =
  | { type: 'initialContentLoaded'; value: true }
  | { type: 'setInitializationErrors'; value: string[] }
  | { type: 'recipes.updateOne'; value: RecipeAttributes }
  | { type: 'recipes.setAll'; value: { [id: string]: RecipeAttributes } }
  | { type: 'recipe.saving'; value: boolean }
  | { type: 'recipe.clearSaveErrors'; value: undefined }
  | { type: 'recipe.setSaveErrors'; value: string[] }
  | { type: 'recipe.setCurrentRecipe'; value: RecipeAttributes }
  | { type: 'setInputEditor'; value: any }
  | { type: 'setOutputEditor'; value: any }
  | { type: 'updateSettings'; value: DevToolsSettings }
  | { type: 'request.start'; value: undefined }
  | { type: 'request.failed'; value: string }
  | { type: 'request.success'; value: undefined }
  | { type: 'requestRestore.failure'; value: string };

const determineIfReady = (state: Store) => {
  return Boolean(
    registry.getInputEditor() && registry.getOutputEditor() && state.initialContentLoaded
  );
};

export const reducer: Reducer<Store, Action> = (state, action) => {
  const nextState = { ...state };

  switch (action.type) {
    case 'initialContentLoaded':
      nextState.initialContentLoaded = true;
      nextState.ready = determineIfReady(nextState);
      break;
    case 'setInputEditor':
      registry.setInputEditor(action.value);
      nextState.ready = determineIfReady(nextState);
      break;
    case 'setOutputEditor':
      registry.setOutputEditor(action.value);
      nextState.ready = determineIfReady(nextState);
      break;
    case 'updateSettings':
      nextState.settings = action.value;
      break;
    case 'requestRestore.failure':
      nextState.restoreFromHistoryErrorMessage = action.value;
      break;
    case 'request.start':
      nextState.requestInFlight = true;
      break;
    case 'request.failed':
      nextState.requestInFlight = false;
      nextState.lastRequestErrorMessage = action.value;
      break;
    case 'request.success':
      nextState.requestInFlight = false;
      break;
    case 'setInitializationErrors':
      nextState.initializationErrors = action.value;
      break;
    case 'recipes.updateOne':
      nextState.recipes = {
        ...(nextState.recipes || {}),
        [action.value.id]: action.value,
      };
      break;
    case 'recipes.setAll':
      nextState.recipes = action.value;
      break;
    case 'recipe.setCurrentRecipe':
      nextState.currentRecipe = action.value;
      break;
    case 'recipe.saving':
      nextState.savingRecipe = action.value;
      break;
    case 'recipe.setSaveErrors':
      nextState.recipeSaveErrors = action.value;
      break;
    case 'recipe.clearSaveErrors':
      nextState.recipeSaveErrors = [];
      break;
    default:
      throw new Error(`Unknown action: ${action}`);
  }

  return nextState;
};
