/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { EuiThemeProvider } from '@elastic/eui';
import { DesignerToolbar } from '@kbn/designer-toolbar';
import type { DesignerToolbarLabels } from '@kbn/designer-toolbar';
import { CommentOverlay } from './comment_overlay';
import { designerAnnotationStore } from './designer_annotation_store';
import {
  DESIGNER_ANNOTATION_REQUEST_EVENT,
  DESIGNER_REMOVE_ALL_ANNOTATIONS_EVENT,
} from './constants';

interface DesignerToolbarRendererProps {
  http: HttpStart;
}

const LABELS: DesignerToolbarLabels = {
  title: 'Designer',
  expandToolbar: 'Expand designer toolbar',
  minimizeToolbar: 'Minimize',
  hideToolbar: 'Right-click to hide until reload',
  annotate: 'Annotate',
  removeAllAnnotations: 'Clear annotations',
  showOverlay: 'Show annotations',
  hideOverlay: 'Hide annotations',
  configEnabledHint: 'Enabled via designerToolbar.enabled',
};

export const DesignerToolbarRenderer: React.FC<DesignerToolbarRendererProps> = ({ http }) => {
  const [canvasVisible, setCanvasVisible] = useState(
    () => designerAnnotationStore.getCanvasVisible()
  );

  useEffect(() => {
    return designerAnnotationStore.subscribe(setCanvasVisible);
  }, []);

  const handleAnnotate = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DESIGNER_ANNOTATION_REQUEST_EVENT));
  }, []);

  const handleRemoveAllAnnotations = useCallback(() => {
    window.dispatchEvent(new CustomEvent(DESIGNER_REMOVE_ALL_ANNOTATIONS_EVENT));
  }, []);

  const handleToggleCanvasVisible = useCallback(() => {
    designerAnnotationStore.setCanvasVisible(!designerAnnotationStore.getCanvasVisible());
  }, []);

  return (
    <EuiThemeProvider colorMode="dark">
      <DesignerToolbar
        labels={LABELS}
        onAnnotate={handleAnnotate}
        onRemoveAllAnnotations={handleRemoveAllAnnotations}
        onToggleCanvasVisible={handleToggleCanvasVisible}
        canvasVisible={canvasVisible}
      />
      <CommentOverlay http={http} />
    </EuiThemeProvider>
  );
};
