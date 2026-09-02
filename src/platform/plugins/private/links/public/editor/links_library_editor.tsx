/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIsWithinBreakpoints } from '@elastic/eui';
import { BehaviorSubject } from 'rxjs';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { EmbeddableEditorPreview } from '@kbn/presentation-util-plugin/public';
import type { LinksEmbeddableState, LinksByValueState } from '../../common';
import { LINKS_EMBEDDABLE_TYPE } from '../../common';
import { LINKS_VERTICAL_LAYOUT } from '../../common/constants';
import type { LinksApi, LinksParentApi, ResolvedLink } from '../types';
import { dashboardLocator } from '../services/kibana_services';
import { serializeResolvedLinks } from '../lib/resolve_links';
import type { EditorState } from './get_editor_flyout';
import { getEditorFlyout } from './get_editor_flyout';

export const LinksLibraryEditor = ({
  initialState,
  closeFlyout,
}: {
  initialState: EditorState;
  closeFlyout: () => void;
}) => {
  const isNarrowScreen = useIsWithinBreakpoints(['xs', 's', 'm']);
  const [isPreviewOpen, setIsPreviewOpen] = useState(!isNarrowScreen);
  const [draftState, setDraftState] = useState<LinksByValueState>({
    layout: initialState.layout ?? LINKS_VERTICAL_LAYOUT,
    links: serializeResolvedLinks(initialState.links ?? []),
    title: initialState.title,
    description: initialState.description,
  });
  const [previewState, setPreviewState] = useState(draftState);

  useEffect(() => {
    if (isNarrowScreen) setIsPreviewOpen(false);
  }, [isNarrowScreen]);

  const previewParentApi = useMemo(
    () => ({
      savedObjectId$: new BehaviorSubject<string | undefined>(undefined),
      title$: new BehaviorSubject(initialState.title),
      hideTitle$: new BehaviorSubject<boolean | undefined>(false),
      description$: new BehaviorSubject(initialState.description),
      timeRange$: new BehaviorSubject<TimeRange | undefined>(undefined),
      filters$: new BehaviorSubject<Filter[] | undefined>([]),
      query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
      locator: dashboardLocator,
    }),
    [initialState.description, initialState.title]
  );

  const onDraftChange = useCallback(
    (links: ResolvedLink[], layout: LinksByValueState['layout']) => {
      setDraftState({
        layout,
        links: serializeResolvedLinks(links),
        title: initialState.title,
        description: initialState.description,
      });
    },
    [initialState.description, initialState.title]
  );

  return (
    <>
      {getEditorFlyout({
        initialState,
        closeFlyout,
        onDraftChange,
        isPreviewOpen,
        onOpenPreview: () => setIsPreviewOpen(true),
        onPreview: () => setPreviewState(draftState),
      })}
      <EmbeddableEditorPreview<LinksEmbeddableState, LinksApi, LinksParentApi>
        type={LINKS_EMBEDDABLE_TYPE}
        serializedState={previewState}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        verticalAlignment="top"
        getParentApi={() => ({
          ...previewParentApi,
          getSerializedStateForChild: () => previewState,
        })}
      />
    </>
  );
};
