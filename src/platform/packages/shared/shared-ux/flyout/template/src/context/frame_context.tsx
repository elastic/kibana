/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { MutableRefObject } from 'react';
import type { FlyoutTemplateProps, FlyoutTemplateTabRootProps } from '../types';

/** What a frame shares with the `FlyoutTemplate` declarations rendered inside it. */
export interface FlyoutTemplateFrameState {
  /** Id the declaration's header title renders with; the frame labels the flyout by it. */
  flyoutTitleId: string;
  /** Under a managing opener: the declaration's `onClose` runs before the opener closes. */
  isManaged: boolean;
  /** Tells the frame whether the current declaration renders a header to be labeled by. */
  setHasHeader: (hasHeader: boolean) => void;
  /** The current declaration's `onClose`, which a managed frame runs before tearing down. */
  declarationOnCloseRef: MutableRefObject<FlyoutTemplateProps['onClose'] | undefined>;
  /** Tab props given to the frame, used where the declaration does not set its own. */
  tabProps: FlyoutTemplateTabRootProps;
}

/** @internal */
export const FlyoutTemplateFrameContext = createContext<FlyoutTemplateFrameState | null>(null);

/** @internal Returns the enclosing frame, or `null` when a `FlyoutTemplate` owns its flyout. */
export const useFlyoutTemplateFrame = (): FlyoutTemplateFrameState | null =>
  useContext(FlyoutTemplateFrameContext);
