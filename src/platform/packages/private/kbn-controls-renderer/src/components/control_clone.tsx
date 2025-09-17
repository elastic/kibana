/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import React from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { SerializedPanelState } from '@kbn/presentation-publishing';
import type { ControlsGroupState } from '@kbn/controls-schemas';

import { controlWidthStyles } from './control_panel.styles';

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({
  state,
  width,
}: {
  state: SerializedPanelState<ControlsGroupState['controls'][number]> | undefined;
  width: number | undefined;
}) => {
  const styles = useMemoCss(controlCloneStyles);

  return !state ? null : (
    <EuiFlexItem
      css={(styles.container, width !== undefined && css({ width: `${width}px` }))}
      // className={classNames({
      //   'controlFrameWrapper--medium': state.rawState.width === 'medium',
      //   'controlFrameWrapper--small': state.rawState.width === 'small',
      //   'controlFrameWrapper--large': state.rawState.width === 'large',
      // })}
    >
      <EuiFlexGroup responsive={false} gutterSize="none" css={styles.dragContainer}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" css={styles.grabIcon} />
        </EuiFlexItem>
        <EuiFlexItem>
          <label>{state.rawState.title}</label>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

const controlCloneStyles = {
  container: (context: UseEuiTheme) => [
    css({
      width: 'max-content',
    }),
    controlWidthStyles(context),
  ],
  grabIcon: css({ cursor: 'grabbing' }),
  dragContainer: (context: UseEuiTheme) =>
    css([
      {
        cursor: 'grabbing',
        height: context.euiTheme.size.xl,
        alignItems: 'center',
        borderRadius: context.euiTheme.border.radius.medium,
        fontWeight: context.euiTheme.font.weight.bold,
        border: `${context.euiTheme.border.width.thin} solid ${context.euiTheme.colors.borderBasePlain}`,
        minWidth: `calc(${context.euiTheme.size.base} * 14)`,
        backgroundColor: context.euiTheme.colors.backgroundBaseFormsPrepend,
      },
      euiFontSize(context, 'xs'),
    ]),
};
