/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import {
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { EmbeddableRenderer, ViewMode } from '../../../src/plugins/embeddable/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  MULTI_TASK_TODO_EMBEDDABLE,
  TODO_EMBEDDABLE,
  ListContainerFactory,
  SearchableListContainerFactory,
} from '../../embeddable_examples/public';
import { SearchableContainerInput } from '../../embeddable_examples/public/searchable_list_container/searchable_list_container';
import { TodoInput } from '../../embeddable_examples/public/todo';
import { MultiTaskTodoInput } from '../../embeddable_examples/public/multi_task_todo';

interface Props {
  listContainerEmbeddableFactory: ListContainerFactory;
  searchableListContainerEmbeddableFactory: SearchableListContainerFactory;
}

export function ListContainerExample({
  listContainerEmbeddableFactory,
  searchableListContainerEmbeddableFactory,
}: Props) {
  const listInput: SearchableContainerInput = {
    id: 'hello',
    title: 'My todo list',
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
  };

  const searchableInput: SearchableContainerInput = {
    id: '1',
    title: 'My searchable todo list',
    viewMode: ViewMode.VIEW,
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
          task: 'Goes out on Wednesdays!',
          icon: 'broom',
          title: 'Take out the trash',
        } as TodoInput,
      },
      '3': {
        type: MULTI_TASK_TODO_EMBEDDABLE,
        explicitInput: {
          id: '3',
          icon: 'searchProfilerApp',
          title: 'Learn more',
          tasks: ['Go to school', 'Watch planet earth', 'Read the encyclopedia'],
        } as MultiTaskTodoInput,
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
            list.
          </EuiText>
          <EuiPanel data-test-subj="listContainerEmbeddablePanel" paddingSize="none" role="figure">
            <EmbeddableRenderer input={listInput} factory={listContainerEmbeddableFactory} />
          </EuiPanel>

          <EuiSpacer />
          <EuiText>
            <p>
              The reason to use a container embeddable instead of just a custom react component is
              because it comes with helpful methods to store the state of all its children
              embeddables, listeners to clean up the input state when an embeddable is added or
              removed, and a way to pass down the container embeddable&#39;s own input to its
              children. In the above example, the container did not take any input. Let&#39;s modify
              it so it does.
            </p>
            <p>
              In this Searchable List Container, the container takes in a search string as input and
              passes that down to all its children. It also listens to its children that output
              `hasMatch`, and removes them from the list when there is a search string and the child
              doesn&#39;t match.
            </p>
            <p>
              The first HelloWorldEmbeddable does not emit the hasMatch output variable, so the
              container chooses to hide it.
            </p>

            <p>
              Check out the &quot;Dynamically adding children&quot; section, to see how to add
              children to this container, and see it rendered inside an `EmbeddablePanel` component.
            </p>
          </EuiText>

          <EuiSpacer />
          <EuiPanel
            data-test-subj="searchableListContainerEmbeddablePanel"
            paddingSize="none"
            role="figure"
          >
            <EmbeddableRenderer
              input={searchableInput}
              factory={searchableListContainerEmbeddableFactory}
            />{' '}
          </EuiPanel>
          <EuiSpacer />
          <EuiText>
            <p>
              There currently is no formal way to limit what children can be added to a container.
              If the use case arose, it wouldn&#39;t be difficult. In the mean time, it&#39;s good
              to understand that children may ignore input they don&#39;t care about. Likewise the
              container will have to choose what to do when it encounters children that are missing
              certain output variables.
            </p>
          </EuiText>
        </EuiPageContentBody>
      </EuiPageContent>
    </EuiPageBody>
  );
}
