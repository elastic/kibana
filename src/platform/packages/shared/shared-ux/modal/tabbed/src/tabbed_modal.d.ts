/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import type { EuiModal } from '@elastic/eui';
import { type EuiTabProps, type CommonProps } from '@elastic/eui';
import {
  type ITabDeclaration,
  type IDispatchFunction,
  type IModalContextProviderProps,
} from './context';
export type IModalTabContent<S> = (props: {
  state: S;
  dispatch: IDispatchFunction;
}) => ReactElement;
interface IModalTabActionBtn<S> extends CommonProps {
  id: string;
  dataTestSubj: string;
  label: string;
  handler: (args: { state: S }) => void;
  isCopy?: boolean;
  style?: (args: { state: S }) => boolean;
}
export interface IModalTabDeclaration<S = {}> extends EuiTabProps, ITabDeclaration<S> {
  description?: string;
  'data-test-subj'?: string;
  content: IModalTabContent<S>;
  modalActionBtn?: IModalTabActionBtn<S>;
}
export interface ITabbedModalInner
  extends Pick<ComponentProps<typeof EuiModal>, 'onClose' | 'outsideClickCloses'> {
  modalWidth?: number;
  modalTitle?: string;
  anchorElement?: HTMLElement;
  aboveTabsContent?: ReactNode;
  'data-test-subj'?: string;
}
export declare function TabbedModal<T extends Array<IModalTabDeclaration<any>>>({
  tabs,
  defaultSelectedTabId,
  ...rest
}: Omit<IModalContextProviderProps<T>, 'children'> & ITabbedModalInner): React.JSX.Element;
export {};
