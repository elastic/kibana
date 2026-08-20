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
  ['data-description']?: string;
  ['data-render-complete']: boolean;
  ['data-rendering-count']?: number;
  ['data-title']?: string;
}

export function useSharingAttributes(
  componentApi: DefaultPresentationPanelApi,
  onInitialRenderComplete: () => void,
  isSharedItem: boolean
) {
  const initialRenderCompleteRef = useRef(false);

  const [sharingAttributes, setSharingAttributes] = useState<ShareAttributes>({
    ['data-shared-item']: true,
    ['data-render-complete']: false,
  });

  const [
    blockingError,
    defaultDescription,
    description,
    defaultTitle,
    title,
    dataLoading,
    rendered,
    renderCount,
  ] = useBatchedPublishingSubjects(
    componentApi.blockingError$ ?? new BehaviorSubject(undefined),
    componentApi.defaultDescription$ ?? new BehaviorSubject(undefined),
    componentApi.description$ ?? new BehaviorSubject(undefined),
    componentApi.defaultTitle$ ?? new BehaviorSubject(undefined),
    componentApi.title$ ?? new BehaviorSubject(undefined),
    componentApi.dataLoading$ ?? new BehaviorSubject(false),
    componentApi.rendered$ ?? new BehaviorSubject(true),
    componentApi.renderCount$ ?? new BehaviorSubject(undefined)
  );

  useEffect(() => {
    const shareTitle = title ?? defaultTitle;
    const shareDescription = description ?? defaultDescription;

    setSharingAttributes({
      ['data-shared-item']: true,
      ['data-render-complete']: Boolean(blockingError) || (!dataLoading && rendered),
      ...(renderCount !== undefined && { ['data-rendering-count']: renderCount }),
      ...(shareTitle && { ['data-title']: shareTitle }),
      ...(shareDescription && { ['data-description']: shareDescription }),
    });
  }, [
    blockingError,
    defaultDescription,
    description,
    title,
    defaultTitle,
    dataLoading,
    rendered,
    renderCount,
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
