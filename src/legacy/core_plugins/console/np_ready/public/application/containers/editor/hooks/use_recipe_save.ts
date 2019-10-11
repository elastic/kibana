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

import { debounce } from 'lodash';
import { AppDatabase } from '../../../app_database';
import { RecipeAttributes } from '../../../models/recipe';
import { useEditorActionContext, useEditorReadContext } from '../context';

interface Dependencies {
  database: AppDatabase;
}

const AUTO_SAVE_DELAY_MS = 500;
export function useRecipeSave({ database }: Dependencies) {
  const { recipeSaveErrors, recipes } = useEditorReadContext();
  const dispatch = useEditorActionContext();

  const save = debounce(async (recipe: RecipeAttributes) => {
    if (recipeSaveErrors.length) {
      dispatch({ type: 'recipe.clearSaveErrors', value: undefined });
    }
    try {
      // Update local (primary source of truth after init)
      dispatch({
        type: 'recipes.update',
        value: {
          ...recipes,
          [recipe.id]: recipe,
        },
      });
      dispatch({ type: 'recipe.saving', value: true });
      // Update remote
      await database.recipes.update(recipe);
    } catch (e) {
      dispatch({ type: 'recipe.setSaveErrors', value: [e.message] });
    } finally {
      dispatch({ type: 'recipe.saving', value: false });
    }
  }, AUTO_SAVE_DELAY_MS);

  return {
    save,
  };
}
