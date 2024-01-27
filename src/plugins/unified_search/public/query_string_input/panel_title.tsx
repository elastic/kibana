/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiContextMenuItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  keys,
  logicalCSS,
  useEuiTheme,
} from '@elastic/eui';
import { EuiContextMenuClass } from '@elastic/eui/src/components/context_menu/context_menu';
import React, { KeyboardEvent, ReactNode, RefObject, useCallback, useRef } from 'react';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import { QueryBarMenuPanel } from './query_bar_menu_panels';

export const PanelTitle = ({
  queryBarMenuRef,
  title,
  append,
}: {
  queryBarMenuRef: RefObject<EuiContextMenuClass>;
  title: string;
  append?: ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  const titleRef = useRef<HTMLButtonElement | null>(null);

  const onTitleClick = useCallback(
    () => queryBarMenuRef.current?.showPanel(QueryBarMenuPanel.main, 'previous'),
    [queryBarMenuRef]
  );

  const onTitleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== keys.ARROW_LEFT) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      queryBarMenuRef.current?.showPreviousPanel();
      queryBarMenuRef.current?.onUseKeyboardToNavigate();
    },
    [queryBarMenuRef]
  );

  useEffectOnce(() => {
    const panel = titleRef.current?.closest('.euiContextMenuPanel');
    const focus = () => titleRef.current?.focus();

    panel?.addEventListener('animationend', focus, { once: true });

    return () => panel?.removeEventListener('animationend', focus);
  });

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      alignItems="center"
      css={[logicalCSS('border-bottom', euiTheme.border.thin)]}
    >
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <EuiContextMenuItem
            buttonRef={titleRef}
            className="euiContextMenuPanel__title"
            icon="arrowLeft"
            onClick={onTitleClick}
            onKeyDown={onTitleKeyDown}
            data-test-subj="contextMenuPanelTitleButton"
            css={{
              '&:enabled:focus': {
                /* Override the default focus background on EUiContextMenuItems */
                backgroundColor: 'unset',
              },
            }}
          >
            {title}
          </EuiContextMenuItem>
        </EuiTitle>
      </EuiFlexItem>
      {append && (
        <EuiFlexItem grow={false} css={{ paddingInline: euiTheme.size.s }}>
          {append}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
