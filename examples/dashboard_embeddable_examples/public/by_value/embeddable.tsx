/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { DashboardContainerInput, DashboardStart } from '@kbn/dashboard-plugin/public';
import { HELLO_WORLD_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public/hello_world';
import { TODO_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public/todo';
import { TODO_REF_EMBEDDABLE } from '@kbn/embeddable-examples-plugin/public/todo/todo_ref_embeddable';
import { InputEditor } from './input_editor';

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
  timeRestore: false,
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
  DashboardContainerByValueRenderer: ReturnType<
    DashboardStart['getDashboardContainerByValueRenderer']
  >;
}) => {
  const [input, setInput] = useState(initialInput);

  return (
    <>
      <InputEditor input={input} onSubmit={setInput} />
      <DashboardContainerByValueRenderer input={input} onInputUpdated={setInput} />
    </>
  );
};
