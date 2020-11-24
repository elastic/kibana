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

import { useCallback, useEffect, useState } from 'react';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';

import { TableVisUiState } from '../../types';

const defaultSort = {
  columnIndex: null,
  direction: null,
};

export const useSort = (uiState: IInterpreterRenderHandlers['uiState']) => {
  const [sort, setSortState] = useState<TableVisUiState['sort']>(
    uiState?.get('vis.params.sort') || defaultSort
  );

  const setSort = useCallback(
    (s: TableVisUiState['sort'] = defaultSort) => {
      uiState?.set('vis.params.sort', s);
    },
    [uiState]
  );

  useEffect(() => {
    const updateOnChange = () => {
      const { vis } = uiState?.getChanges();
      setSortState(vis?.params.sort || defaultSort);
    };

    uiState?.on('change', updateOnChange);

    return () => {
      uiState?.off('change', updateOnChange);
    };
  }, [uiState]);

  return { sort, setSort };
};
