/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiPanel, EuiText, EuiButtonIcon, EuiTitle } from '@elastic/eui';
import { Props } from './grid_item';

export const StyledGridItem: FC<Props> = ({
  id,
  x,
  y,
  w,
  h,
  title,
  render,
  subGrid,
  isCollapsed,
  updateItem,
}) => {
  const toggleCollapse = useCallback(() => {
    updateItem(id, { isCollapsed: !isCollapsed });
  }, [id, isCollapsed, updateItem]);

  const gridItemStyles = useMemo(
    () => css`
      grid-column-start: ${x + 1};
      grid-column-end: ${x + 1 + w};
      grid-row-start: ${y + 1};
      grid-row-end: ${y + 1 + (isCollapsed ? 1 : h)};
    `,
    [x, y, w, h, isCollapsed]
  );

  const contentStyles = css`
    width: 100%;
    height: 100%;
  `;

  return (
    <EuiPanel
      id={id}
      className="dshGridItem embPanel embPanel--editing"
      css={gridItemStyles}
      paddingSize="none"
      hasShadow
    >
      <div className="dshGridItem__content" css={contentStyles}>
        <span data-test-subj="dashboardPanelTitle__wrapper">
          <figcaption className="embPanel__header" style={{ height: '24px' }}>
            {Boolean(subGrid) ? (
              <EuiButtonIcon
                iconType="arrowDown"
                onClick={toggleCollapse}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} panel group`}
              />
            ) : null}
            <EuiTitle>
              <h2 className="embPanel__title embPanel__dragger">
                <span className="embPanel__titleInner">
                  <span className="embPanel__titleText">
                    <EuiText size="xs" color="subdued">
                      {title || '[No title]'}
                    </EuiText>
                  </span>
                </span>
              </h2>
            </EuiTitle>
            <EuiButtonIcon iconType="gear" aria-label="Open menu" />
          </figcaption>
        </span>
        {!subGrid || !isCollapsed ? (
          <div
            className="embPanel__content"
            css={css`
              padding: 4px;
            `}
          >
            {render ? render() : null}
          </div>
        ) : null}
      </div>
    </EuiPanel>
  );
};
