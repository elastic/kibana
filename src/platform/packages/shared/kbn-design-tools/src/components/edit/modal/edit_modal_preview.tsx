/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getContentRoot } from '../../../edit_engine/managed_element';
import { ElementTree } from './element_tree';

const treeCss = css({
  overflow: 'auto',
  height: 400,
});

const rowBaseCss = css({ minHeight: 400, position: 'sticky', top: 0, zIndex: 1 });
const previewItemCss = css({ flex: '1 1 0', minWidth: 0, overflow: 'hidden' });
const treeItemCss = css({ flex: '0 0 300px', minWidth: 200 });

interface Props {
  target: HTMLElement;
  cloneRoot: HTMLElement | null;
  selectedElement: Element | null;
  onSelect: (element: Element) => void;
  previewCallbackRef: (node: HTMLDivElement | null) => void;
}

export const EditModalPreview = ({
  target,
  cloneRoot,
  selectedElement,
  onSelect,
  previewCallbackRef,
}: Props) => {
  const { euiTheme } = useEuiTheme();

  const rowCss = useMemo(
    () =>
      css(rowBaseCss, {
        background: euiTheme.colors.backgroundBasePlain,
        paddingBottom: euiTheme.size.s,
        boxShadow: `0 ${euiTheme.size.xs} ${euiTheme.size.s} -${euiTheme.size.xs} ${euiTheme.colors.shadow}`,
        padding: euiTheme.size.xs,
      }),
    [euiTheme]
  );

  // Checkerboard transparency pattern (fixed light colors are intentional)
  const previewScrollerCss = useMemo(() => {
    return css({
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      borderRadius: euiTheme.border.radius.medium,
      padding: euiTheme.size.m,
      overflow: 'auto',
      backgroundColor: '#FFFFFF',
      backgroundImage: `
        linear-gradient(45deg, #eeeeee 25%, transparent 25%),
        linear-gradient(-45deg, #eeeeee 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #eeeeee 75%),
        linear-gradient(-45deg, transparent 75%, #eeeeee 75%)
      `,
      backgroundSize: '16px 16px',
      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
      height: 400,
    });
  }, [euiTheme]);

  const previewContentCss = useMemo(() => {
    return css({
      width: '100%',
      minWidth: 'max-content',
      minHeight: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
  }, []);

  return (
    <EuiFlexGroup gutterSize="m" css={rowCss}>
      <EuiFlexItem css={previewItemCss}>
        <div css={previewScrollerCss} onWheel={(e) => e.stopPropagation()}>
          <div ref={previewCallbackRef} css={previewContentCss} />
        </div>
      </EuiFlexItem>
      <EuiFlexItem css={treeItemCss}>
        {cloneRoot && (
          <div css={treeCss}>
            <ElementTree
              root={getContentRoot(target)}
              selectedElement={selectedElement}
              onSelect={onSelect}
            />
          </div>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
