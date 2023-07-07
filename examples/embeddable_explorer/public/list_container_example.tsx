/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiPageTemplate,
  EuiCodeBlock,
} from '@elastic/eui';
import { EmbeddableRenderer, ViewMode } from '@kbn/embeddable-plugin/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  MULTI_TASK_TODO_EMBEDDABLE,
  TODO_EMBEDDABLE,
  ListContainerFactory,
  SearchableListContainerFactory,
} from '@kbn/embeddable-examples-plugin/public';
import { SearchableContainerInput } from '@kbn/embeddable-examples-plugin/public/searchable_list_container/searchable_list_container';
import { TodoInput } from '@kbn/embeddable-examples-plugin/public/todo';
import { MultiTaskTodoInput } from '@kbn/embeddable-examples-plugin/public/multi_task_todo';

interface Props {
  listContainerEmbeddableFactory: ListContainerFactory;
}

export function ListContainerExample({
  listContainerEmbeddableFactory,
}: Props) {
  return (
    <>
      <EuiPageTemplate.Header
        pageTitle="Container embeddable"
      />
      <EuiPageTemplate.Section grow={false}>
        <>
          <EuiText>
            Use container embeddable to render a group of embeddables.
          </EuiText>
          <EuiSpacer />
          <EuiPanel data-test-subj="listContainerEmbeddablePanel" paddingSize="none" role="figure">
            <EmbeddableRenderer
              factory={listContainerEmbeddableFactory}
              input={{
                id: 'hello',
                title: 'Todo list',
                viewMode: ViewMode.VIEW,
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
                      task: 'Goes out on Wednesdays!',
                      icon: 'broom',
                      title: 'Take out the trash',
                    } as TodoInput,
                  },
                  '3': {
                    type: TODO_EMBEDDABLE,
                    explicitInput: {
                      id: '3',
                      icon: 'broom',
                      title: 'Vaccum the floor',
                    } as TodoInput,
                  },
                },
              }}
            />
          </EuiPanel>
          <EuiSpacer />
          <EuiCodeBlock language="jsx" fontSize="m" paddingSize="m">
            {
`<EmbeddableRenderer
  factory={listContainerEmbeddableFactory}
  input={{
    id: 'hello',
    title: 'Todo list',
    viewMode: ViewMode.VIEW,
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
          task: 'Goes out on Wednesdays!',
          icon: 'broom',
          title: 'Take out the trash',
        } as TodoInput,
      },
      '3': {
        type: TODO_EMBEDDABLE,
        explicitInput: {
          id: '3',
          icon: 'broom',
          title: 'Vaccum the floor',
        } as TodoInput,
      },
    },
  }}
/>`
}
          </EuiCodeBlock>
        </>
      </EuiPageTemplate.Section>
    </>
  );
}
