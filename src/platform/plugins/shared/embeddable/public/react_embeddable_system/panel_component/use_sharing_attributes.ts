/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { DefaultPresentationPanelApi } from './types';

interface ShareAttributes {
  ['data-shared-item']: boolean;
  ['data-description']: string;
  ['data-render-complete']: boolean;
  ['data-title']: string;
}

export function useSharingAttributes(
  componentApi: DefaultPresentationPanelApi,
  onInitialRenderComplete: () => void,
  isSharedItem: boolean
) {
  const initialRenderCompleteRef = useRef(false);

  const [sharingAttributes, setSharingAttributes] = useState<ShareAttributes>({
    ['data-shared-item']: true,
    ['data-description']: '',
    ['data-render-complete']: false,
    ['data-title']: '',
  });

  const [
    blockingError,
    defaultDescription,
    description,
    defaultTitle,
    title,
    dataLoading,
    rendered,
  ] = useBatchedPublishingSubjects(
    componentApi.blockingError$ ?? new BehaviorSubject(undefined),
    componentApi.defaultDescription$ ?? new BehaviorSubject(undefined),
    componentApi.description$ ?? new BehaviorSubject(undefined),
    componentApi.defaultTitle$ ?? new BehaviorSubject(undefined),
    componentApi.title$ ?? new BehaviorSubject(undefined),
    componentApi.dataLoading$ ?? new BehaviorSubject(false),
    componentApi.rendered$ ?? new BehaviorSubject(true)
  );

  useEffect(() => {
    // only update share attribures until initial render is complete
    if (!isSharedItem || initialRenderCompleteRef.current) {
      return;
    }

    setSharingAttributes({
      ['data-shared-item']: true,
      ['data-description']: description ?? defaultDescription ?? '',
      ['data-render-complete']: Boolean(blockingError) || (!dataLoading && rendered),
      ['data-title']: title ?? defaultTitle ?? '',
    });
  }, [
    blockingError,
    defaultDescription,
    description,
    title,
    defaultTitle,
    dataLoading,
    rendered,
    isSharedItem,
  ]);

  useEffect(() => {
    if (!initialRenderCompleteRef.current && sharingAttributes['data-render-complete']) {
      initialRenderCompleteRef.current = true;
      onInitialRenderComplete();
    }
  }, [sharingAttributes, onInitialRenderComplete]);

  return sharingAttributes;
}
