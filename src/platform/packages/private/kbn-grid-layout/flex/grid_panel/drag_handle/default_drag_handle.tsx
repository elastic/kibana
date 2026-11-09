/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { EuiIcon, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getKeyboardDragInstructions } from '../../use_keyboard_announcements';
import type { DragHandleApi } from './use_drag_handle_api';

export const DefaultDragHandle = React.memo(
  ({ dragHandleApi }: { dragHandleApi: DragHandleApi }) => {
    // `aria-description` is a global ARIA 1.3 attribute, but the jsx-a11y rule only knows the
    // ARIA 1.2 list and would flag it on a `button`, so it is passed as a props object
    const descriptionProps = { 'aria-description': getKeyboardDragInstructions() };
    return (
      <button
        onMouseDown={dragHandleApi.startDrag}
        onTouchStart={dragHandleApi.startDrag}
        onKeyDown={dragHandleApi.startDrag}
        aria-label={i18n.translate('kbnGridLayout.flex.dragHandle.ariaLabel', {
          defaultMessage: 'Drag to move',
        })}
        {...descriptionProps}
        className="kbnFlexPanel--dragHandle"
        data-test-subj="kbnFlexPanel--dragHandle"
        css={styles}
      >
        <EuiIcon type="drag" aria-hidden={true} />
      </button>
    );
  }
);

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    opacity: 0,
    display: 'flex',
    cursor: 'grab',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: `-${euiTheme.size.l}`,
    width: euiTheme.size.l,
    height: euiTheme.size.l,
    zIndex: euiTheme.levels.modal,
    marginLeft: euiTheme.size.s,
    border: `1px solid ${euiTheme.border.color}`,
    borderBottom: 'none',
    backgroundColor: euiTheme.colors.backgroundBasePlain,
    borderRadius: `${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0 0`,
    transition: `${euiTheme.animation.slow} opacity`,
    '.kbnFlexPanel:hover &, .kbnFlexPanel:focus-within &, &:active, &:focus': {
      opacity: '1 !important',
    },
    '&:active': {
      cursor: 'grabbing',
    },
    '.kbnFlex--static &, .kbnFlexPanel--expanded &': {
      display: 'none',
    },
  });

DefaultDragHandle.displayName = 'kbnFlexLayoutDefaultDragHandle';
