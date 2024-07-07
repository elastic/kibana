/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiIcon,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { of } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';

import { Interpolation, Theme } from '@emotion/react';
import { useAirdrop } from '../services';
import { type Props as AirdropDragButtonProps } from './airdrop_drag_button';
import { DragWrapper } from './drag_wrapper';
import { GroupContentSelector } from './group_content_selector';

interface Props<T = unknown> extends Omit<AirdropDragButtonProps<T>, 'content'> {
  description: string;
  content?: AirdropDragButtonProps<T>['content'];
  group?: string;
  cssPopover?: Interpolation<Theme>;
}

export function AirdropPopover<T>({
  description,
  group,
  display = 'empty',
  iconSize,
  size,
  cssPopover,
  content: _content,
}: Props<T>) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const { getContents$ForGroup } = useAirdrop();

  const toggleSelectContent = (id: string) => {
    setSelected(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const contents$ = useMemo(() => {
    if (!group) return of([]);
    return getContents$ForGroup(group);
  }, [getContents$ForGroup, group]);
  const contents = useObservable(contents$, []);

  const selectedContent = useMemo(() => {
    return contents.filter(({ id }) => selected.includes(id));
  }, [contents, selected]);

  const content = useMemo<AirdropDragButtonProps['content']>(() => {
    if (_content) return _content;

    const hasAsyncGetters = selectedContent.some((c) => Boolean(c.getAsync));
    if (hasAsyncGetters) {
      return {
        id: `__group__.${group}`,
        getAsync: async () => {
          const asyncContent: { [id: string]: unknown } = {};
          await Promise.all(
            selectedContent.map((c) => {
              if (!c.get && !c.getAsync) {
                throw new Error('AirdropContent must have either a get or getAsync method');
              }
              const promise = c.getAsync ? c.getAsync() : Promise.resolve(c.get!());
              return promise.then((v) => (asyncContent[c.id] = v));
            })
          );
          return asyncContent;
        },
      };
    }

    return {
      id: `__group__.${group}`,
      get: () =>
        selectedContent.reduce((acc, c) => {
          if (!c.get) {
            throw new Error('AirdropContent must have a get method');
          }
          return { ...acc, [c.id]: c.get() };
        }, {}),
    };
  }, [_content, selectedContent, group]);

  useEffect(() => {
    setSelected(contents.map(({ id }) => id));
  }, [contents]);

  return (
    <EuiPopover
      css={cssPopover}
      button={
        <EuiButtonIcon
          display={display}
          iconSize={iconSize}
          size={size}
          iconType="share"
          aria-label="Share"
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="downCenter"
    >
      <EuiPopoverTitle>
        Airdrop <EuiIcon type="watchesApp" css={{ marginLeft: '8px' }} />
      </EuiPopoverTitle>
      <div style={{ width: '300px' }}>
        <EuiText size="s">
          <p>{description}</p>
        </EuiText>

        {contents.length > 0 && (
          <>
            <EuiSpacer />
            <GroupContentSelector
              contents={contents}
              selected={selected}
              toggleSelectContent={toggleSelectContent}
            />
          </>
        )}
      </div>
      <EuiPopoverFooter>
        <DragWrapper content={content}>
          {({ isLoadingContent }) => (
            <EuiButton iconType="grab" fullWidth size="s" disabled={isLoadingContent}>
              Drag on other Kibana window
            </EuiButton>
          )}
        </DragWrapper>
      </EuiPopoverFooter>
    </EuiPopover>
  );
}
