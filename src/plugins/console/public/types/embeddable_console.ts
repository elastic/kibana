/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, MouseEventHandler } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { Dispatch } from 'react';

export interface EmbeddableConsoleDependencies {
  core: CoreStart;
  usageCollection?: UsageCollectionStart;
  setDispatch: (dispatch: Dispatch<EmbeddedConsoleAction> | null) => void;
  alternateView?: EmbeddedConsoleView;
  isMonacoEnabled: boolean;
  isDevMode: boolean;
  getConsoleHeight: () => string | undefined;
  setConsoleHeight: (value: string) => void;
}

export type EmbeddedConsoleAction =
  | { type: 'open'; payload?: { content?: string; alternateView?: boolean } }
  | { type: 'close' };

export enum EmbeddableConsoleView {
  Closed,
  Console,
  Alternate,
}

export interface EmbeddedConsoleStore {
  consoleHasBeenOpened: boolean;
  view: EmbeddableConsoleView;
  loadFromContent?: string;
}

export interface EmbeddedConsoleViewButtonProps {
  activeView: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}
export interface EmbeddedConsoleView {
  ActivationButton: ComponentType<EmbeddedConsoleViewButtonProps>;
  ViewContent: ComponentType<{}>;
}
