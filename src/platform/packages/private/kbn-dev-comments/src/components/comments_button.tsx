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
}

/**
 * The button that toggles comment mode, and the layer itself. Mount it as the
 * page loads rather than on first use: the clicks that reveal UI are recorded
 * from then on, and a comment made in UI opened earlier would have no trail.
 */
export const CommentsButton = ({ services }: CommentsButtonProps) => {
  const [controller] = useState(() => createCommentsController(services));

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
