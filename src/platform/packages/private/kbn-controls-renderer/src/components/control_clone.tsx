/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';

import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, euiFontSize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { SerializedPanelState } from '@kbn/presentation-publishing';

import { controlWidthStyles } from './control_panel.styles';

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title so that we don't recreate the embeddable API on drag.
 */
export const ControlClone = ({
  state,
  width,
}: {
  state: SerializedPanelState<object> | undefined;
  width: number | undefined;
}) => {
  const styles = useMemoCss(controlCloneStyles);
  const panelTitle = (state?.rawState as { title?: string }).title;

  const widthStyle = useMemo(() => {
    return width ? css({ width: `${width}px` }) : undefined;
  }, [width]);

  return !state ? null : (
    <EuiFlexItem css={[styles.container, widthStyle]}>
      <EuiFlexGroup responsive={false} gutterSize="none" css={styles.dragContainer}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" css={styles.grabIcon} />
        </EuiFlexItem>
        {panelTitle?.length && (
          <EuiFlexItem>
            <label>{panelTitle}</label>
          </EuiFlexItem>
        )}
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
