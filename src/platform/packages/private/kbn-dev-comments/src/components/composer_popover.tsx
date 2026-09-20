/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getAnchorPoint } from '../lib/anchor';
import type { PendingComment } from '../state/comments_controller';
import { CommentEditor } from './comment_editor';
import { useComments } from './comments_context';
import { DisplayNameField, useDisplayName } from './display_name_field';
import { PinMarker } from './pin_marker';
import { PopoverBody } from './popover_body';
import {
  popoverPanelProps,
  useLayerPortal,
  useLayerZIndex,
  useLayoutTick,
  usePanelZIndex,
} from './hooks';

export const ComposerPopover = ({ pending }: { pending: PendingComment }) => {
  const controller = useComments();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('devCommentsComposer', zIndex.pins);
  const panelRef = usePanelZIndex(zIndex.popover);
  const [text, setText] = useState('');
  const [displayName, setDisplayName] = useDisplayName();
  const canCapture = controller.services.captureViewport !== undefined;
  const [attachScreenshot, setAttachScreenshot] = useState(canCapture);
  const { saving } = pending;
  useLayoutTick();

  // The popover took the focus; when the comment is discarded or saved it goes
  // back to the commented element (a saved comment's pin then takes it over).
  const { element } = pending;
  useEffect(
    () => () => {
      if (element instanceof HTMLElement && element.isConnected) {
        element.focus({ preventScroll: true });
      }
    },
    [element]
  );

  const canSave = !saving && text.trim().length > 0 && displayName.trim().length > 0;

  const save = () => {
    if (canSave) {
      void controller.save(text, { attachScreenshot, displayName });
    }
  };

  const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      save();
    }
  };

  if (!container) {
    return null;
  }

  // Same position the saved pin will get.
  const { x, y } = pending.element.isConnected
    ? getAnchorPoint(pending.anchor, pending.element)
    : pending.point;

  return createPortal(
    <>
      <PinMarker x={x} y={y} />
      <div
        css={css`
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          width: 1px;
          height: 1px;
        `}
      >
        <EuiPopover
          // EuiPopover positions its panel when it opens; remount it when another click moves the comment.
          key={`${pending.point.x},${pending.point.y}`}
          button={<span />}
          aria-label={i18n.translate('devComments.composer.label', {
            defaultMessage: 'New comment',
          })}
          isOpen
          // A page click moves the comment instead; Cancel and Esc discard it.
          closePopover={() => {}}
          anchorPosition="downCenter"
          panelPaddingSize="none"
          panelProps={popoverPanelProps}
          panelRef={panelRef}
          repositionOnScroll
          zIndex={zIndex.popover}
          initialFocus="[data-test-subj='devCommentsComposerInput'] textarea"
        >
          <PopoverBody data-test-subj="devCommentsComposer">
            <CommentEditor
              value={text}
              readOnly={saving}
              onChange={setText}
              onSubmit={save}
              placeholder={i18n.translate('devComments.composer.placeholder', {
                defaultMessage: 'Leave a comment…',
              })}
              aria-label={i18n.translate('devComments.composer.label', {
                defaultMessage: 'Comment',
              })}
              data-test-subj="devCommentsComposerInput"
            />
            <EuiSpacer size="s" />
            <DisplayNameField
              value={displayName}
              onChange={setDisplayName}
              onKeyDown={onNameKeyDown}
              readOnly={saving}
            />
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              {canCapture && (
                <EuiFlexItem
                  grow={false}
                  css={css`
                    white-space: nowrap;
                  `}
                >
                  <EuiSwitch
                    compressed
                    label={i18n.translate('devComments.composer.attachScreenshot', {
                      defaultMessage: 'Attach screenshot',
                    })}
                    checked={attachScreenshot}
                    disabled={saving}
                    onChange={(event) => setAttachScreenshot(event.target.checked)}
                    data-test-subj="devCommentsAttachScreenshot"
                  />
                </EuiFlexItem>
              )}
              <EuiFlexItem />
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="s"
                  isDisabled={saving}
                  onClick={() => controller.cancelPending()}
                >
                  {i18n.translate('devComments.composer.cancel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  isDisabled={!canSave}
                  isLoading={saving}
                  onClick={save}
                  data-test-subj="devCommentsComposerSubmit"
                >
                  {i18n.translate('devComments.composer.submit', {
                    defaultMessage: 'Comment',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </PopoverBody>
        </EuiPopover>
      </div>
    </>,
    container
  );
};
