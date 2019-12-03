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
  EuiPanel,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import {
  GetEmbeddableFactory,
  EmbeddableFactoryRenderer,
} from '../../../src/plugins/embeddable/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  TODO_EMBEDDABLE,
  MULTI_TASK_TODO_EMBEDDABLE,
  SEARCHABLE_LIST_CONTAINER,
  LIST_CONTAINER,
} from '../../embeddable_examples/public';

interface Props {
  getEmbeddableFactory: GetEmbeddableFactory;
}

export function ListContainerExample({ getEmbeddableFactory }: Props) {
  const listInput = {
    id: 'hello',
    title: 'My todo list',
    panels: {
      '1': {
        type: HELLO_WORLD_EMBEDDABLE,
        explicitInput: {
          id: '1',
        },
      },
      '2': {
        type: TODO_EMBEDDABLE,
        explicitInput: {
          id: '2',
          task: 'Goes out on Wenesdays!',
          icon: 'broom',
          title: 'Take out the trash',
        },
      },
      '3': {
        type: TODO_EMBEDDABLE,
        explicitInput: {
          id: '3',
          icon: 'broom',
          title: 'Vaccum the floor',
        },
      },
    },
  };

  const searchableInput = {
    id: '1',
    title: 'My searchable todo list',
    panels: {
      '1': {
        type: HELLO_WORLD_EMBEDDABLE,
        explicitInput: {
          id: '1',
          title: 'Hello',
        },
      },
      '2': {
        type: TODO_EMBEDDABLE,
        explicitInput: {
          id: '2',
          task: 'Goes out on Wenesdays!',
          icon: 'broom',
          title: 'Take out the trash',
        },
      },
      '3': {
        type: MULTI_TASK_TODO_EMBEDDABLE,
        explicitInput: {
          id: '3',
          icon: 'searchProfilerApp',
          title: 'Learn more',
          tasks: ['Go to school', 'Watch planet earth', 'Read the encylopedia'],
        },
      },
    },
  };

  return (
    <EuiPageBody>
      <EuiPageHeader>
        <EuiPageHeaderSection>
          <EuiTitle size="l">
            <h1>List container example</h1>
          </EuiTitle>
        </EuiPageHeaderSection>
      </EuiPageHeader>
      <EuiPageContent>
        <EuiPageContentBody>
          <EuiText>
            Here is a container embeddable that contains other embeddables and displays them in a
            list
          </EuiText>
          <EuiPanel data-test-subj="listContainerEmbeddablePanel" paddingSize="none" role="figure">
            <EmbeddableFactoryRenderer
              getEmbeddableFactory={getEmbeddableFactory}
              type={LIST_CONTAINER}
              input={listInput}
            />
          </EuiPanel>

          <EuiSpacer />
          <EuiText>
            <p>
              The reason to use a container embeddable instead of just a custom react component is
              because it comes with helpful methods to store the state of all it&#39;s children
              embeddables, listeners to clean up the input state when an embeddable is added or
              removed, and a way to pass down the container embeddable&#39;s own input to it&#39;s
              children. For this particular example, the container does not take any input.
              Let&#39;s modify it so it does.
            </p>
            <p>
              Now in this second example, the container takes in a filter string as input and passes
              that down to all it&#39;s children.
            </p>
          </EuiText>

          <EuiSpacer />
          <EuiPanel
            data-test-subj="searchableListContainerEmbeddablePanel"
            paddingSize="none"
            role="figure"
          >
            <EmbeddableFactoryRenderer
              getEmbeddableFactory={getEmbeddableFactory}
              type={SEARCHABLE_LIST_CONTAINER}
              input={searchableInput}
            />{' '}
          </EuiPanel>
          <EuiSpacer />
          <EuiText>
            <p>
              If you use the filter input above, you&#39;ll notice the only child that filters
              it&#39;s contents is the last one. This is because the first two don&#39;t take
              `filter` as input. There currently is no formal way to limit what children can be
              added to a container. If the use case arose, it wouldn&#39;t be difficult. In the mean
              time, it&#39;s good to understand that chilren may ignore input they don&#39;t care
              about.
            </p>
          </EuiText>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
