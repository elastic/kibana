/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { createAnnotationsController } from '../state/annotations_controller';
import type { AnnotationsHostServices } from '../types';
import { AnnotationsProvider } from './annotations_context';
import { AnnotationsLayer } from './annotations_layer';
import { AnnotationsToolbarButton } from './annotations_toolbar_button';

export interface AnnotationsButtonProps {
  services: AnnotationsHostServices;
  /** Start in comment mode, for hosts that mount the layer when the user first asks for it. */
  initialActive?: boolean;
}

export const AnnotationsButton = ({ services, initialActive = false }: AnnotationsButtonProps) => {
  const [controller] = useState(() => createAnnotationsController(services, { initialActive }));

  useEffect(() => {
    controller.start();
    return () => controller.dispose();
  }, [controller]);

  return (
    <AnnotationsProvider controller={controller}>
      <AnnotationsToolbarButton />
      <AnnotationsLayer />
    </AnnotationsProvider>
  );
};
