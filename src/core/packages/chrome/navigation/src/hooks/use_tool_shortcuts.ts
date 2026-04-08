/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import useEvent from 'react-use/lib/useEvent';
import { isMac } from '@kbn/shared-ux-utility';
import type { ToolItem } from '../../types';

/**
 * Hook to handle keyboard shortcuts for tool items.
 * @param tools - The tool items to handle shortcuts for.
 */

interface UseToolShortcutsProps {
  tools: ToolItem[];
}

export const useToolShortcuts = ({ tools }: UseToolShortcutsProps) => {
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const toolWithShortcut = tools.find(
        (tool) =>
          tool.shortcutKey &&
          event.key === tool.shortcutKey &&
          (isMac ? event.metaKey : event.ctrlKey)
      );
      if (toolWithShortcut) {
        event.preventDefault();
        toolWithShortcut.onClick?.();
      }
    },
    [tools]
  );
  useEvent('keydown', onKeyDown);
};
