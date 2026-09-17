/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { createCommentsController } from '../state/comments_controller';
import type { CommentsHostServices } from '../types';
import { CommentsProvider } from './comments_context';
import { CommentsLayer } from './comments_layer';
import { CommentsToolbarButton } from './comments_toolbar_button';

export interface CommentsButtonProps {
  services: CommentsHostServices;
  /** Start in comment mode, for hosts that mount the layer when the user first asks for it. */
  initialActive?: boolean;
}

export const CommentsButton = ({ services, initialActive = false }: CommentsButtonProps) => {
  const [controller] = useState(() => createCommentsController(services, { initialActive }));

  useEffect(() => {
    controller.start();
    return () => controller.dispose();
  }, [controller]);

  return (
    <CommentsProvider controller={controller}>
      <CommentsToolbarButton />
      <CommentsLayer />
    </CommentsProvider>
  );
};
