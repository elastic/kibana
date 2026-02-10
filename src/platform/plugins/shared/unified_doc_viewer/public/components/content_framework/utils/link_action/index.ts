/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent, MouseEventHandler } from 'react';

interface LinkActionProps {
  href?: string;
  onClick?: () => void;
}

function isPlainLeftClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * Creates `href` and `onClick` props that preserve native link behavior for
 * right-clicks and modifier-clicks, while allowing a handler to run on plain
 * left-click (preventing navigation when `href` is present).
 */
export function getLinkActionProps({ href, onClick }: LinkActionProps): {
  href?: string;
  onClick?: MouseEventHandler;
} {
  const handleClick: MouseEventHandler | undefined = onClick
    ? (e) => {
        // If we have an href, keep native link behaviour for right clicks and modifier clicks.
        // Plain left click should run the provided handler instead.
        if (href && !isPlainLeftClick(e)) return;
        if (href) e.preventDefault();
        onClick();
      }
    : undefined;

  return {
    href,
    onClick: handleClick,
  };
}
