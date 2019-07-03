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

import { useState, useRef } from 'react';
import { Form } from '../use_form';

interface Props {
  path: string;
  form: Form<any>;
  children: (
    args: {
      rows: Row[];
      addRow: () => void;
      removeRow: (id: number) => void;
    }
  ) => JSX.Element;
}

interface Row {
  id: number;
  rowPath: string;
  isNew: boolean;
}

export const UseArray = ({ path, form, children }: Props) => {
  const defaultValues = form.getDefaultValueField(path) as any[];
  const uniqueId = useRef(0);

  const getInitialRowsFromValues = (values: any[]): Row[] =>
    values.map((_, index) => ({
      id: uniqueId.current++,
      rowPath: `${path}.${index}`,
      isNew: false,
    }));

  const getNewRowAtIndex = (index: number): Row => ({
    id: uniqueId.current++,
    rowPath: `${path}.${index}`,
    isNew: true,
  });

  const initialState = defaultValues
    ? getInitialRowsFromValues(defaultValues)
    : [getNewRowAtIndex(0)];

  const [rows, setRows] = useState<Row[]>(initialState);

  const updatePrefixes = (_rows: Row[]) =>
    _rows.map(
      (row, index) =>
        ({
          id: row.id,
          rowPath: `${path}.${index}`,
        } as Row)
    );

  const addRow = () => {
    setRows(previous => {
      const rowIndex = previous.length;
      return [...previous, getNewRowAtIndex(rowIndex)];
    });
  };

  const removeRow = (id: number) => {
    const rowIndexToDelete = rows.length - 1;

    setRows(previousRows => {
      const updatedRows = previousRows.filter(row => row.id !== id);
      return updatePrefixes(updatedRows);
    });

    form.removeFieldsStartingWith(`${path}.${rowIndexToDelete}`);
  };

  return children({ rows, addRow, removeRow });
};
