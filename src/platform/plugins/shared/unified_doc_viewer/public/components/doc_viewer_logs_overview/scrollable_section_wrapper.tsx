/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiAccordionProps } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback } from 'react';
import type { ReactElement } from 'react';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

export interface ScrollableSectionWrapperApi {
  openAndScrollToSection: () => void;
}

export type ScrollableSectionWrapperChildrenProps = Pick<
  EuiAccordionProps,
  'forceState' | 'onToggle'
>;

export interface ScrollableSectionWrapperProps {
  children: (props: ScrollableSectionWrapperChildrenProps) => ReactElement;
  defaultState?: EuiAccordionProps['forceState'];
}

const SKIP_TRANSITION_CSS = css({
  '.euiAccordion__childWrapper': { transition: 'none !important' },
});

export const ScrollableSectionWrapper = forwardRef<
  ScrollableSectionWrapperApi,
  ScrollableSectionWrapperProps
>(({ children, defaultState = 'closed' }, ref) => {
  const [{ forceState, skipTransition }, setState] = useState<{
    forceState: NonNullable<EuiAccordionProps['forceState']>;
    skipTransition: boolean;
  }>({
    forceState: defaultState,
    skipTransition: false,
  });
  const onToggle = useCallback(
    (isOpen: boolean) => setState((prev) => ({ ...prev, forceState: isOpen ? 'open' : 'closed' })),
    []
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      openAndScrollToSection: () => {
        const wrapper = wrapperRef.current;

        if (!wrapper) {
          return;
        }

        if (forceState === 'closed') {
          setState({ forceState: 'open', skipTransition: true });
        }

        setTimeout(() => {
          wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setState((prev) => ({ ...prev, skipTransition: false }));
        }, 100);
      },
    }),
    [forceState]
  );

  return (
    <div ref={wrapperRef} css={skipTransition ? SKIP_TRANSITION_CSS : undefined}>
      {children({ forceState, onToggle })}
    </div>
  );
});
