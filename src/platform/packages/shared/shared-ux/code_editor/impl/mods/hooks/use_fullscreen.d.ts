/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Fullscreen logic
 */
import type React from 'react';
import { type KeyboardEvent } from 'react';
export declare const useFullScreen: ({ allowFullScreen }: { allowFullScreen?: boolean }) => {
  FullScreenButton: React.FC<{}>;
  FullScreenDisplay: ({
    children,
  }: {
    children: Array<JSX.Element | null> | JSX.Element;
  }) => React.JSX.Element;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  isFullScreen: boolean;
  setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
};
