/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useRef } from 'react';
import { DiscoverServices } from '../../../build_services';
import { IndexPattern } from '../../../../../data/common';

export interface DiscoverIndexPatternManagementProps {
  /**
   * Currently selected index pattern
   */
  selectedIndexPattern?: IndexPattern;
  /**
   * Discover plugin services;
   */
  services: DiscoverServices;

  editorOpen: boolean;

  onSave: () => void;
}

export function HomeIndexPatternManagement(props: DiscoverIndexPatternManagementProps) {
  const { services, editorOpen, onSave } = props;
  const { indexPatternEditor } = services;
  const canEditIndexPattern = true; // indexPatternEditor?.userPermissions.editIndexPattern();
  const closeEditor = useRef<() => void | undefined>();

  const editIndexPattern = useCallback(() => {
    if (!canEditIndexPattern) {
      return;
    }
    const ref = indexPatternEditor.openEditor({
      onSave,
    });
    closeEditor.current = ref;
  }, [canEditIndexPattern, indexPatternEditor, onSave]);

  useEffect(() => {
    const cleanup = () => {
      if (closeEditor?.current) {
        closeEditor?.current();
      }
    };
    return () => {
      // Make sure to close the editor when unmounting
      cleanup();
    };
  }, []);

  if (!canEditIndexPattern || !editorOpen) {
    return null;
  }

  editIndexPattern();

  return null;
}
