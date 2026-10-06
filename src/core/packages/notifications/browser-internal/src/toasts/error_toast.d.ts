/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { RenderingService } from '@kbn/core-rendering-browser';
interface ErrorToastProps {
  title: string;
  error: Error;
  toastMessage: string;
  openModal: OverlayStart['openModal'];
  rendering: RenderingService;
}
/**
 * This should instead be replaced by the overlay service once it's available.
 * This does not use React portals so that if the parent toast times out, this modal
 * does not disappear. NOTE: this should use a global modal in the overlay service
 * in the future.
 */
export declare function showErrorDialog({
  title,
  error,
  openModal,
  rendering,
}: Pick<ErrorToastProps, 'error' | 'title' | 'openModal' | 'rendering'>): void;
export declare function getErrorToastActionProps({
  title,
  error,
  openModal,
  rendering,
}: Pick<ErrorToastProps, 'title' | 'error' | 'openModal' | 'rendering'>): {
  primary: {
    size: 's';
    color: 'danger';
    'data-test-subj': string;
    children: React.JSX.Element;
    onClick: () => void;
  };
};
export {};
