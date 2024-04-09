/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiListGroup, EuiPanel } from '@elastic/eui';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';

import { initializeTitles, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { cloneDeep } from 'lodash';
import React, { createContext, useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';

import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { extract, inject } from '../../common/embeddable';
import {
  CONTENT_ID,
  DASHBOARD_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from '../../common/content_management';
import { DashboardLinkComponent } from '../components/dashboard_link/dashboard_link_component';
import { ExternalLinkComponent } from '../components/external_link/external_link_component';
import { LinksApi, LinksSerializedState } from './types';
import { APP_NAME } from '../../common';
import { intializeLibraryTransforms } from './initialize_library_transforms';
import { initializeLinks } from './initialize_links';

export const LinksContext = createContext<LinksApi | null>(null);

export const getLinksEmbeddableFactory = () => {
  const linksEmbeddableFactory: ReactEmbeddableFactory<LinksSerializedState, LinksApi> = {
    type: CONTENT_ID,
    deserializeState: (state) => {
      const serializedState = cloneDeep(state.rawState) as EmbeddableStateWithType;
      if (serializedState === undefined) return {};
      const deserializedState = inject(
        serializedState,
        state.references ?? []
      ) as unknown as LinksSerializedState;
      return deserializedState;
    },
    buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
      const { titlesApi, titleComparators, serializeTitles } = initializeTitles(state);
      const { linksApi, linksComparators, serializeLinks } = await initializeLinks(
        state,
        parentApi
      );
      const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.title);
      const defaultPanelDescription = new BehaviorSubject<string | undefined>(state.description);

      const serializeState = (): SerializedPanelState<LinksSerializedState> => {
        const { state: rawState, references } = extract({
          ...state,
          ...serializeTitles(),
          ...serializeLinks(),
        });
        return {
          rawState: rawState as unknown as LinksSerializedState,
          references,
        };
      };

      const isByReference = state.savedObjectId !== undefined;

      const api = buildApi(
        {
          defaultPanelTitle,
          defaultPanelDescription,
          ...titlesApi,
          ...linksApi,
          ...intializeLibraryTransforms(
            { links: linksApi.links$.value, layout: linksApi.layout$.value },
            serializeState,
            isByReference
          ),
          isEditingEnabled: () => true,
          getTypeDisplayName: () => APP_NAME,
          serializeState,
        },
        {
          ...linksComparators,
          ...titleComparators,
        }
      );

      const Component = () => {
        const [resolvedLinks, layout] = useBatchedPublishingSubjects(
          api.resolvedLinks$,
          api.layout$
        );

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
                      api={api}
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
        api,
        Component,
      };
    },
  };
  return linksEmbeddableFactory;
};
