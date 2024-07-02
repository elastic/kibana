/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { type FC, useState, useMemo } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import { type Props as AirdropDragButtonProps } from './airdrop_drag_button';
import { DragWrapper } from './drag_wrapper';
import { useAirdrop } from '../services';

interface Props extends Omit<AirdropDragButtonProps, 'content'> {
  description: string;
  content?: AirdropDragButtonProps['content'];
  group?: string;
}

export const AirdropPopover: FC<Props> = ({
  description,
  group,
  iconSize,
  size,
  content: _content,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { getContents$ForGroup } = useAirdrop();
  const contents$ = useMemo(() => {
    if (!group) return of([]);
    return getContents$ForGroup(group);
  }, [getContents$ForGroup, group]);
  const contents = useObservable(contents$, []);
  console.log('Airdrop contents for group', group, contents);

  const content = useMemo<AirdropDragButtonProps['content']>(() => {
    if (_content) return _content;

    return {
      id: '__group__',
      get: () => contents.reduce((acc, c) => ({ ...acc, [c.id]: c.get() }), {}),
    };
  }, [_content, contents]);

  return (
    <EuiPopover
      button={
        <EuiButtonIcon
          display="base"
          iconSize={iconSize}
          size={size}
          iconType="watchesApp"
          aria-label="Next"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>Airdrop</EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>

        <EuiSpacer />

        <ul>
          {contents.map((c) => (
            <li key={c.id}>{c.label ?? c.id}</li>
          ))}
        </ul>
      </div>
      <EuiPopoverFooter>
        <DragWrapper content={content}>
          <EuiButton fullWidth size="s">
            Drag on other Kibana window
          </EuiButton>
        </DragWrapper>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};
