/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState } from 'react';
import { PanelSelectedNode } from '@kbn/core-chrome-browser';

export const useHoverOpener = ({
  onOpen,
  onClose,
}: {
  onOpen: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
}) => {
  const HOVER_OPEN_DELAY = 200;
  const HOVER_CLOSE_DELAY = 300;

  const openTimer = React.useRef<number | null>(null);
  const closeTimer = React.useRef<number | null>(null);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const onMouseEnter = useCallback(
    (event: React.MouseEvent) => {
      clearTimers();
      openTimer.current = window.setTimeout(() => {
        onOpen(event);
      }, HOVER_OPEN_DELAY);
    },
    [onOpen]
  );

  const onMouseLeave = useCallback(
    (event: React.MouseEvent) => {
      clearTimers();
      closeTimer.current = window.setTimeout(() => {
        onClose(event);
      }, HOVER_CLOSE_DELAY);
    },
    [onClose]
  );

  return {
    onMouseEnter,
    onMouseLeave,
  };
};

export const useHoverOpener2 = ({
  onHover,
  onLeave,
}: {
  onHover: (node: PanelSelectedNode) => void;
  onLeave: () => void;
}) => {
  const HOVER_OPEN_DELAY = 200;
  const HOVER_CLOSE_DELAY = 300;

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback(
    (node: PanelSelectedNode) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onHover(node);
      }, HOVER_OPEN_DELAY);
    },
    [onHover]
  );
  const onMouseLeave = useCallback(
    (node: PanelSelectedNode) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onLeave();
      }, HOVER_CLOSE_DELAY);
    },
    [onLeave]
  );

  return {
    onMouseEnter,
    onMouseLeave,
  };
};
