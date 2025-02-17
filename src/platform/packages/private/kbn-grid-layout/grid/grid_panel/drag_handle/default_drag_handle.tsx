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
import { DragHandleApi } from './use_drag_handle_api';

export const DefaultDragHandle = React.memo(
  ({ dragHandleApi }: { dragHandleApi: DragHandleApi }) => {
    return (
      <button
        onMouseDown={dragHandleApi.startDrag}
        onTouchStart={dragHandleApi.startDrag}
        aria-label={i18n.translate('kbnGridLayout.dragHandle.ariaLabel', {
          defaultMessage: 'Drag to move',
        })}
        className="kbnGridPanel__dragHandle"
        data-test-subj="kbnGridPanel--dragHandle"
        css={styles}
      >
        <EuiIcon type="grabOmnidirectional" />
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
    borderRadius: `${euiTheme.border.radius} ${euiTheme.border.radius} 0 0`,
    transition: `${euiTheme.animation.slow} opacity`,
    touchAction: 'none',
    '.kbnGridPanel:hover &, .kbnGridPanel:focus-within &, &:active, &:focus': {
      opacity: '1 !important',
    },
    '&:active': {
      cursor: 'grabbing',
    },
    '.kbnGrid--static &, .kbnGridPanel--expanded &': {
      display: 'none',
    },
  });

DefaultDragHandle.displayName = 'KbnGridLayoutDefaultDragHandle';
