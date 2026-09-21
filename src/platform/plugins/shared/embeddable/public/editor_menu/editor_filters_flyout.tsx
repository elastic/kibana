/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EditorMenuManager } from './types';

interface EditorFiltersFlyoutProps {
  closeFlyout: () => void;
  menuManager: EditorMenuManager;
}

export const EditorFiltersFlyout = ({
  closeFlyout,
  menuManager,
}: EditorFiltersFlyoutProps): React.ReactElement => {
  useEffect(() => {
    const editor = document.getElementById(menuManager.flyoutId);
    editor?.setAttribute('inert', '');
    editor?.setAttribute('aria-hidden', 'true');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeFlyout();
      }
    };
    const onOutsidePointer = (event: Event) => {
      const filters = document.getElementById(`${menuManager.flyoutId}-filters`);
      if (event.target instanceof Node && !filters?.contains(event.target)) {
        event.stopImmediatePropagation();
      }
    };
    const pointerEvents = ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'] as const;
    pointerEvents.forEach((event) => window.addEventListener(event, onOutsidePointer, true));
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      pointerEvents.forEach((event) => window.removeEventListener(event, onOutsidePointer, true));
      window.removeEventListener('keydown', onKeyDown, true);
      editor?.removeAttribute('inert');
      editor?.removeAttribute('aria-hidden');
      menuManager.returnToEditor();
    };
  }, [closeFlyout, menuManager]);

  return (
    <>
      <EuiFlyoutBody data-test-subj="editorFiltersFlyoutBody" />
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout}>
              {i18n.translate('embeddableApi.editorMenu.cancelFiltersButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={closeFlyout}>
              {i18n.translate('embeddableApi.editorMenu.applyFiltersButtonLabel', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
