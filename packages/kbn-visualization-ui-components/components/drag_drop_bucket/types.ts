/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DraggableProvided } from '@hello-pangea/dnd';

export interface BucketContainerProps {
  children: React.ReactNode;
  removeTitle: string;
  idx: number;
  onRemoveClick: () => void;
  isDragging?: boolean;
  draggableProvided?: DraggableProvided;
  isInvalid?: boolean;
  invalidMessage?: string;
  isNotRemovable?: boolean;
  isNotDraggable?: boolean;
  'data-test-subj'?: string;
}
