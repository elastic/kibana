/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroup, EuiPanel } from '@elastic/eui';
import fastIsEqual from 'fast-deep-equal';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';

import { useStateFromPublishingSubject, initializeTitles } from '@kbn/presentation-publishing';
import { cloneDeep } from 'lodash';
import React, { createContext, useMemo } from 'react';
import { BehaviorSubject, switchMap } from 'rxjs';

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { LinksPersistableState } from '../../common/embeddable/types';
import { extract, inject } from '../../common/embeddable';
import {
  CONTENT_ID,
  DASHBOARD_LINK_TYPE,
  Link,
  LinksAttributes,
  LinksLayoutType,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkComponent } from '../components/dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from '../components/external_link/external_link_component';
import { memoizedGetOrderedLinkList } from '../editor/links_editor_tools';
import { LinksApi, LinksSerializableState } from './types';
import { resolveLinkInfo } from './utils';
import { APP_NAME } from '../../common';
import { openEditorFlyout } from '../editor/open_editor_flyout';
import { LinksByValueInput } from '../embeddable/types';

export const LinksContext = createContext<LinksApi | null>(null);

export const getLinksEmbeddableFactory = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<LinksSerializableState, LinksApi> = {
    type: CONTENT_ID,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState) as EmbeddableStateWithType;
      if (serializedState === undefined) return {};
      return inject(serializedState, state.references ?? []) as unknown as LinksSerializableState;
    },
    buildEmbeddable: async (state, buildApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const links$ = new BehaviorSubject(state.attributes?.links);
      const layout$ = new BehaviorSubject(state.attributes?.layout);

      const resolveLinks = async (links: Link[] = []) => {
        const orderedLinks = memoizedGetOrderedLinkList(links);
        return await Promise.all(
          orderedLinks.map(async (link) => {
            return { ...link, ...(await resolveLinkInfo(link)) };
          })
        );
        // return await Promise.reject(new Error('boom'));
      };

      const resolvedLinks$ = new BehaviorSubject<
        Array<Link & { title: string; description?: string; error?: Error }>
      >([]);
      const error$ = new BehaviorSubject<Error | undefined>(undefined);

      // write an observable that takes changes from links$ and executes the resolveLinks promise. subscribe to the results and update resolvedLinks$.
      links$.pipe(switchMap((links) => resolveLinks(links))).subscribe({
        next: (result) => resolvedLinks$.next(result),
        error: (error) => error$.next(error),
      });

      const linksApi = buildApi(
        {
          ...titlesApi,
          canLinkToLibrary: async () => true,
          linkToLibrary: async () => {},
          canUnlinkFromLibrary: async () => true,
          unlinkFromLibrary: async () => {},
          blockingError: error$,
          onEdit: async () => {
            try {
              const { newInput } = await openEditorFlyout(
                {
                  attributes: {
                    links: links$.getValue() ?? [],
                    layout: layout$.getValue() ?? LINKS_VERTICAL_LAYOUT,
                  },
                },
                linksApi.parentApi
              );
              links$.next((newInput as LinksByValueInput).attributes.links);
              layout$.next((newInput as LinksByValueInput).attributes.layout);
            } catch {
              // do nothing, user cancelled
            }
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: () => APP_NAME,
          serializeState: () => {
            const { state: rawState, references } = extract({
              ...state,
              ...serializeTitles(),
              links: links$.getValue(),
              layout: layout$.getValue(),
            } as unknown as LinksPersistableState);
            return {
              rawState: rawState as unknown as LinksAttributes,
              references,
            };
          },
        },
        {
          links: [links$, (nextLinks?: Link[]) => links$.next(nextLinks), fastIsEqual],
          layout: [
            layout$,
            (nextLayout?: LinksLayoutType) => layout$.next(nextLayout),
            fastIsEqual,
          ],
          ...titleComparators,
        }
      );

      const Component = () => {
        const resolvedLinks = useStateFromPublishingSubject(resolvedLinks$);
        const layout = useStateFromPublishingSubject(layout$);

        const linkItems: { [id: string]: { id: string; content: JSX.Element } } = useMemo(() => {
          return resolvedLinks.reduce((prev, currentLink) => {
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
        }, [resolvedLinks, layout]);
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
              {resolvedLinks.map((link) => linkItems[link.id].content)}
            </EuiListGroup>
          </EuiPanel>
        );
      };
      return {
        api: linksApi,
        Component,
      };
    },
  };
  return linksEmbeddableFactory;
};
