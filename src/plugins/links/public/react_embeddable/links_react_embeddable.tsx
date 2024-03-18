/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiCallOut, EuiListGroup, EuiPanel } from '@elastic/eui';
import fastIsEqual from 'fast-deep-equal';
import {
  initializeReactEmbeddableTitles,
  ReactEmbeddableFactory,
  registerReactEmbeddableFactory,
} from '@kbn/embeddable-plugin/public';

import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { cloneDeep } from 'lodash';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';

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

export const LinksContext = createContext<LinksApi | null>(null);

export const registerLinksEmbeddable = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<LinksSerializableState, LinksApi> = {
    type: CONTENT_ID,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState) as EmbeddableStateWithType;

      return inject(serializedState, state.references ?? []) as unknown as LinksSerializableState;
    },
    buildEmbeddable: async (state, buildApi) => {
      const { titlesApi, titleComparators, serializeTitles } =
        initializeReactEmbeddableTitles(state);
      const links$ = new BehaviorSubject(state.attributes?.links);
      const layout$ = new BehaviorSubject(state.attributes?.layout);
      const linksApi = buildApi(
        {
          ...titlesApi,
          canLinkToLibrary: async () => true,
          linkToLibrary: async () => {},
          canUnlinkFromLibrary: async () => true,
          unlinkFromLibrary: async () => {},
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
          layout: [layout$, (nextLayout: LinksLayoutType) => layout$.next(nextLayout), fastIsEqual],
          ...titleComparators,
        }
      ) as unknown as LinksApi;

      const Component = () => {
        const links = useStateFromPublishingSubject(links$);
        const layout = useStateFromPublishingSubject(layout$);

        const orderedLinks = memoizedGetOrderedLinkList(links ?? []);
        const [resolvedLinks, setResolvedLinks] = useState<
          Array<Link & { title: string; description?: string; error?: Error }>
        >([]);
        const [error, setError] = useState<Error | undefined>();

        useEffect(() => {
          let ignore = false;
          setError(undefined);
          Promise.all(
            orderedLinks.map(async (link) => {
              return { ...link, ...(await resolveLinkInfo(link)) };
            })
          )
            .then((res) => {
              if (ignore) return;
              setResolvedLinks(res);
            })
            .catch((e) => setError(e));
          return () => {
            ignore = true;
          };
        }, [orderedLinks]);

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
        if (error) {
          return (
            <EuiCallOut title="Search error" color="warning" iconType="warning">
              <p>{error.message}</p>
            </EuiCallOut>
          );
        }
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

  registerReactEmbeddableFactory(linksEmbeddableFactory);
};
