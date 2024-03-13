/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroup, EuiPanel } from '@elastic/eui';
import {
  initializeReactEmbeddableTitles,
  initializeReactEmbeddableUuid,
  ReactEmbeddableFactory,
  RegisterReactEmbeddable,
  registerReactEmbeddableFactory,
  useReactEmbeddableApiHandle,
  useReactEmbeddableUnsavedChanges,
} from '@kbn/embeddable-plugin/public';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { cloneDeep } from 'lodash';
import React, { createContext, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { LinksPersistableState } from '../../common/embeddable/types';
import { CONTENT_ID } from '../../common';
import { extract, inject } from '../../common/embeddable';
import {
  DASHBOARD_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkComponent } from '../components/dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from '../components/external_link/external_link_component';
import { memoizedGetOrderedLinkList } from '../editor/links_editor_tools';
import { LinksByValueInput } from '../embeddable/types';
import { LinksApi } from './types';
import { resolveLinkInfo } from './utils';

export const LinksContext = createContext<LinksApi | null>(null);

export const registerLinksEmbeddable = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<LinksByValueInput, LinksApi> = {
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState) as EmbeddableStateWithType;

      return inject(serializedState, state.references ?? []) as unknown as LinksByValueInput;
    },
    getComponent: async (state, maybeId) => {
      const { attributes } = state;
      const orderedLinks = memoizedGetOrderedLinkList(attributes.links ?? []);
      const resolvedLinks = await Promise.all(
        orderedLinks.map(async (link) => {
          return { ...link, ...(await resolveLinkInfo(link)) };
        })
      );
      const uuid = initializeReactEmbeddableUuid(maybeId);
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(state);
      const links$ = new BehaviorSubject(resolvedLinks);
      const layout$ = new BehaviorSubject(attributes.layout);

      return RegisterReactEmbeddable((apiRef) => {
        const links = useStateFromPublishingSubject(links$);
        const layout = useStateFromPublishingSubject(layout$);

        const { unsavedChanges, resetUnsavedChanges } = useReactEmbeddableUnsavedChanges(
          uuid,
          linksEmbeddableFactory,
          {
            ...titleComparators,
          }
        );

        const linksApi = useReactEmbeddableApiHandle(
          {
            ...titlesApi,
            unsavedChanges,
            resetUnsavedChanges,
            serializeState: async () => {
              const { state: rawState, references } = extract({
                ...state,
                ...serializeTitles(),
              } as unknown as LinksPersistableState);
              return {
                rawState,
                references,
              };
            },
          },
          apiRef,
          uuid
        ) as unknown as LinksApi;

        const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
          return links.reduce((prev, currentLink) => {
            return {
              ...prev,
              [currentLink.id]: {
                id: currentLink.id,
                content:
                  currentLink.type === DASHBOARD_LINK_TYPE ? (
                    <DashboardLinkComponent
                      key={currentLink.id}
                      link={currentLink}
                      layout={layout ?? LINKS_VERTICAL_LAYOUT}
                      api={linksApi}
                    />
                  ) : (
                    <ExternalLinkComponent
                      key={currentLink.id}
                      link={currentLink}
                      layout={layout ?? LINKS_VERTICAL_LAYOUT}
                    />
                  ),
              },
            };
          }, {});
        }, [links, layout, linksApi]);
        return (
          <EuiPanel
            className={`linksComponent ${
              layout === LINKS_HORIZONTAL_LAYOUT ? 'eui-xScroll' : 'eui-yScroll'
            }`}
            paddingSize="xs"
            data-test-subj="links--component"
          >
            <EuiListGroup
              maxWidth={false}
              className={`${layout ?? LINKS_VERTICAL_LAYOUT}LayoutWrapper`}
              data-test-subj="links--component--listGroup"
            >
              {links.map((link) => linkItems[link.id].content)}
            </EuiListGroup>
          </EuiPanel>
        );
      });
    },
  };

  registerReactEmbeddableFactory(CONTENT_ID, linksEmbeddableFactory);
};
