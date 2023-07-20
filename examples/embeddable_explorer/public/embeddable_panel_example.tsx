/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EuiPanel, EuiText, EuiPageTemplate } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { IEmbeddable, EmbeddablePanel } from '@kbn/embeddable-plugin/public';
import {
  HELLO_WORLD_EMBEDDABLE,
  TODO_EMBEDDABLE,
  BOOK_EMBEDDABLE,
  MULTI_TASK_TODO_EMBEDDABLE,
  SearchableListContainerFactory,
} from '@kbn/embeddable-examples-plugin/public';

interface Props {
  searchListContainerFactory: SearchableListContainerFactory;
}

export function EmbeddablePanelExample({ searchListContainerFactory }: Props) {
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
          task: 'Goes out on Wednesdays!',
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
          tasks: ['Go to school', 'Watch planet earth', 'Read the encyclopedia'],
        },
      },
      '4': {
        type: BOOK_EMBEDDABLE,
        explicitInput: {
          id: '4',
          savedObjectId: 'sample-book-saved-object',
        },
      },
      '5': {
        type: BOOK_EMBEDDABLE,
        explicitInput: {
          id: '5',
          attributes: {
            title: 'The Sympathizer',
            author: 'Viet Thanh Nguyen',
            readIt: true,
          },
        },
      },
      '6': {
        type: BOOK_EMBEDDABLE,
        explicitInput: {
          id: '6',
          attributes: {
            title: 'The Hobbit',
            author: 'J.R.R. Tolkien',
            readIt: false,
          },
        },
      },
    },
  };

  const [embeddable, setEmbeddable] = useState<IEmbeddable | undefined>(undefined);

  const ref = useRef(false);

  useEffect(() => {
    ref.current = true;
    if (!embeddable) {
      const promise = searchListContainerFactory.create(searchableInput);
      if (promise) {
        promise.then((e) => {
          if (ref.current) {
            setEmbeddable(e);
          }
        });
      }
    }
    return () => {
      ref.current = false;
    };
  });

  return (
    <>
      <EuiPageTemplate.Header pageTitle="Context menu" />
      <EuiPageTemplate.Section grow={false}>
        <>
          <EuiText>
            You can render your embeddable inside the EmbeddablePanel component. This adds some
            extra rendering and offers a context menu with pluggable actions. Using EmbeddablePanel
            to render your embeddable means you get access to the &quot;Add panel flyout&quot;. Now
            you can see how to add embeddables to your container, and how
            &quot;getExplicitInput&quot; is used to grab input not provided by the container.
          </EuiText>
          <EuiPanel data-test-subj="embeddedPanelExample" paddingSize="none" role="figure">
            {embeddable ? (
              <EmbeddablePanel embeddable={embeddable} />
            ) : (
              <EuiText>Loading...</EuiText>
            )}
          </EuiPanel>

          <EuiSpacer />
        </>
      </EuiPageTemplate.Section>
    </>
  );
}
