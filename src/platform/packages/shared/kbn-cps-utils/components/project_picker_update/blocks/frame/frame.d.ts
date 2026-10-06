/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type PropsWithChildren, type RefObject, type ComponentProps } from 'react';
import type { ProjectPickerFrameBody } from './partials';
import { type HeaderContextMenuItemProps } from './partials';
interface ProjectPickerFrameProps {
  scrollContainerRef?: RefObject<HTMLDivElement>;
  customHeaderContextMenuItems?: HeaderContextMenuItemProps[];
  customHeaderText?: React.ReactNode;
  maxBodyHeight?: ComponentProps<typeof ProjectPickerFrameBody>['maxHeight'];
  showHeader?: boolean;
}
export declare function ProjectPickerFrame({
  children,
  maxBodyHeight,
  customHeaderContextMenuItems,
  customHeaderText,
  scrollContainerRef,
  showHeader,
}: PropsWithChildren<ProjectPickerFrameProps>): React.JSX.Element;
export {};
