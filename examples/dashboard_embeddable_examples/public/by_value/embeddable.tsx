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

import React from 'react';
import {
  EmbeddableFactoryRenderer,
  EmbeddableStart,
  ViewMode,
} from '../../../../src/plugins/embeddable/public';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainerInput,
} from '../../../../src/plugins/dashboard/public';
import { HELLO_WORLD_EMBEDDABLE } from '../../../embeddable_examples/public/hello_world';
import { InputEditor } from './input_editor';

const initialInput: DashboardContainerInput = {
  id: 'random-id',
  // TODO: do we need all of this props? Looks like we can make those optional
  viewMode: ViewMode.VIEW,
  filters: [],
  timeRange: { to: 'now', from: 'now-1d' },
  useMargins: false,
  title: 'test',
  query: { query: '', language: 'lucene' },
  isFullScreenMode: false,
  refreshConfig: { pause: true, value: 15 },
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
  },
};

export const DashboardEmbeddableByValue = ({
  embeddableApi,
}: {
  embeddableApi: EmbeddableStart;
}) => {
  const embeddableRendererRef = React.useRef<EmbeddableFactoryRenderer>(null);

  return (
    <div>
      <InputEditor
        initialValue={initialInput}
        onSubmit={(newInput) => {
          // TODO: not sure why linter doesn't allow this
          // eslint-disable-next-line no-unused-expressions
          embeddableRendererRef.current?.updateInput(newInput);
        }}
      />
      <EmbeddableFactoryRenderer
        getEmbeddableFactory={embeddableApi.getEmbeddableFactory}
        type={DASHBOARD_CONTAINER_TYPE}
        input={initialInput}
        ref={embeddableRendererRef}
      />
    </div>
  );
};
