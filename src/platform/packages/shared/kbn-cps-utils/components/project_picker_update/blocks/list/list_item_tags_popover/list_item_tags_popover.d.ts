/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiWrappingPopoverProps } from '@elastic/eui';
import type { getProjectTags } from '../../../../utils';
interface ProjectPickerListItemTagsPopoverProps extends Pick<EuiWrappingPopoverProps, 'button'> {
  isOpen: boolean;
  closeHandler: () => void;
  projectTags: ReturnType<typeof getProjectTags>;
}
export declare function ProjectPickerListItemTagsPopover({
  button,
  closeHandler,
  isOpen,
  projectTags,
}: ProjectPickerListItemTagsPopoverProps): React.JSX.Element;
export {};
