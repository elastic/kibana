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
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  getFlyoutManagerStore,
} from '@elastic/eui';
import type { EuiFlyoutProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EditorMenuManager } from './types';

export interface EditorFiltersFlyoutProps {
  menuManager: EditorMenuManager;
  flyoutProps: Pick<
    EuiFlyoutProps,
    'maxWidth' | 'ownFocus' | 'paddingSize' | 'resizable' | 'size' | 'type'
  >;
}

export const EditorFiltersFlyout = ({
  menuManager,
  flyoutProps,
}: EditorFiltersFlyoutProps): React.ReactElement => {
  const { goBack } = getFlyoutManagerStore();
  useEffect(() => {
    const editor = document.getElementById(menuManager.flyoutId);
    editor?.setAttribute('inert', '');
    editor?.setAttribute('aria-hidden', 'true');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        goBack();
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
  }, [menuManager, goBack]);

  const title = i18n.translate('embeddableApi.editorMenu.panelLevelFiltersTitle', {
    defaultMessage: 'Panel level filters',
  });
  return (
    <EuiFlyout
      {...flyoutProps}
      id={`${menuManager.flyoutId}-filters`}
      session="start"
      historyKey={menuManager.historyKey}
      outsideClickCloses={false}
      hideCloseButton
      data-test-subj="editorFiltersFlyout"
      aria-label={title}
      onActive={() => {
        requestAnimationFrame(() => {
          document
            .querySelector<HTMLButtonElement>(`#${menuManager.flyoutId}-filters button`)
            ?.focus();
        });
      }}
      onClose={menuManager.returnToEditor}
      flyoutMenuProps={{
        title,
        hideTitle: false,
        hideCloseButton: true,
        trailingActions: [
          {
            iconType: 'cross',
            'aria-label': i18n.translate('embeddableApi.editorMenu.closeFiltersButtonAriaLabel', {
              defaultMessage: 'Close filters',
            }),
            onClick: () => goBack(),
          },
        ],
      }}
    >
      <EuiFlyoutBody data-test-subj="editorFiltersFlyoutBody" />
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={goBack}>
              {i18n.translate('embeddableApi.editorMenu.cancelFiltersButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={goBack}>
              {i18n.translate('embeddableApi.editorMenu.applyFiltersButtonLabel', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
