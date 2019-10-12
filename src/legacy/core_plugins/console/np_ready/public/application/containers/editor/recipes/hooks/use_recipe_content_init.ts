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

import { useEffect } from 'react';
import { AppDatabase } from '../../../../app_database';
import { useEditorActionContext } from '../../context';
import { scratchPadName } from '../../../../models/recipe';

interface Dependencies {
  database: AppDatabase;
}

// TODO: We need some way to retry this on failures
export function useRecipeContentInit({ database }: Dependencies) {
  const dispatch = useEditorActionContext();

  const init = async () => {
    try {
      const recipes = await database.recipes.findAll();
      if (!recipes) {
        const scratchPad = await database.recipes.create({
          isScratchPad: true,
          name: scratchPadName,
          lastUpdatedAt: Date.now(),
          createdAt: Date.now(),
          text: '',
        });
        dispatch({ type: 'recipes.update', value: scratchPad });
      } else {
        dispatch({ type: 'recipes.setAll', value: recipes });
      }
      dispatch({ type: 'initialContentLoaded', value: true });
    } catch (e) {
      dispatch({ type: 'setInitializationErrors', value: [e.message] });
    }
  };

  // Only run this once.
  useEffect(() => {
    init();
  }, []);
}
