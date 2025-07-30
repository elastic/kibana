/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiIcon,
  UseEuiTheme,
  euiFontSize,
} from '@elastic/eui';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

import classNames from 'classnames';
import { DEFAULT_CONTROL_GROW } from '@kbn/controls-constants';
import { DefaultControlApi } from '../../controls/types';
import { controlWidthStyles } from './control_panel.styles';

/**
 * A simplified clone version of the control which is dragged. This version only shows
 * the title, because individual controls can be any size, and dragging a wide item
 * can be quite cumbersome.
 */
export const ControlClone = ({
  labelPosition,
  controlApi,
}: {
  labelPosition: string;
  controlApi: DefaultControlApi | undefined;
}) => {
  const [width, panelTitle, defaultPanelTitle] = useBatchedPublishingSubjects(
    controlApi ? controlApi.width$ : new BehaviorSubject(DEFAULT_CONTROL_GROW),
    controlApi?.title$ ? controlApi.title$ : new BehaviorSubject(undefined),
    controlApi?.defaultTitle$ ? controlApi.defaultTitle$ : new BehaviorSubject('')
  );
  const isTwoLine = labelPosition === 'twoLine';

  const styles = useMemoCss(controlCloneStyles);

  return (
    <EuiFlexItem
      css={styles.container}
      className={classNames({
        'controlFrameWrapper--medium': width === 'medium',
        'controlFrameWrapper--small': width === 'small',
        'controlFrameWrapper--large': width === 'large',
      })}
    >
      {isTwoLine && <EuiFormLabel>{panelTitle ?? defaultPanelTitle}</EuiFormLabel>}
      <EuiFlexGroup responsive={false} gutterSize="none" css={styles.dragContainer}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="grabHorizontal" css={styles.grabIcon} />
        </EuiFlexItem>
        {!isTwoLine && (
          <EuiFlexItem>
            <label>{panelTitle ?? defaultPanelTitle}</label>
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
