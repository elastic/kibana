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

import React, { useState } from 'react';
import { ViewMode } from '../../../../src/plugins/embeddable/public';
import { DashboardContainerInput, DashboardStart } from '../../../../src/plugins/dashboard/public';
import { HELLO_WORLD_EMBEDDABLE } from '../../../embeddable_examples/public/hello_world';
import { InputEditor } from './input_editor';
import { TODO_EMBEDDABLE } from '../../../embeddable_examples/public/todo';
import { TODO_REF_EMBEDDABLE } from '../../../embeddable_examples/public/todo/todo_ref_embeddable';

const initialInput: DashboardContainerInput = {
  viewMode: ViewMode.VIEW,
  panels: {
    '1': {
      gridData: {
        w: 10,
        h: 10,
        x: 0,
        y: 0,
        i: '1',
      },
      type: HELLO_WORLD_EMBEDDABLE,
      explicitInput: {
        id: '1',
      },
    },
    '2': {
      gridData: {
        w: 10,
        h: 10,
        x: 10,
        y: 0,
        i: '2',
      },
      type: HELLO_WORLD_EMBEDDABLE,
      explicitInput: {
        id: '2',
      },
    },
    '3': {
      gridData: {
        w: 10,
        h: 10,
        x: 0,
        y: 10,
        i: '3',
      },
      type: TODO_EMBEDDABLE,
      explicitInput: {
        id: '3',
        title: 'Clean up',
        task: 'Clean up the code',
        icon: 'trash',
      },
    },
    '4': {
      gridData: {
        w: 10,
        h: 10,
        x: 10,
        y: 10,
        i: '4',
      },
      type: TODO_REF_EMBEDDABLE,
      explicitInput: {
        id: '4',
        savedObjectId: 'sample-todo-saved-object',
      },
    },
  },
  isFullScreenMode: false,
  filters: [],
  useMargins: false,
  id: 'random-id',
  timeRange: {
    to: 'now',
    from: 'now-1d',
  },
  title: 'test',
  query: {
    query: '',
    language: 'lucene',
  },
  refreshConfig: {
    pause: true,
    value: 15,
  },
};

export const DashboardEmbeddableByValue = ({
  DashboardContainerByValueRenderer,
}: {
  DashboardContainerByValueRenderer: DashboardStart['DashboardContainerByValueRenderer'];
}) => {
  const [input, setInput] = useState(initialInput);

  return (
    <>
      <InputEditor input={input} onSubmit={setInput} />
      <DashboardContainerByValueRenderer input={input} onInputUpdated={setInput} />
    </>
  );
};
