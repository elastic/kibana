/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { EuiIcon, EuiLink, EuiLoadingSpinner, EuiPopover, EuiSpacer } from '@elastic/eui';
import { cx, css } from '@emotion/css';
import { core } from '../../kibana_services';

const ENDPOINT = 'http://35.200.137.16:5000/panel';

const DEFAULT_UNAVAILABLE_MESSAGE = 'No explanation available';
export const EmbeddablePanelPopover = React.memo(({ title }: { title?: string }) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [popoverContent, setPopoverContent] = useState<string | null>(null);

  const onButtonClick = useCallback(async () => {
    setIsPopoverOpen(!isPopoverOpen);
    try {
      if (!title) {
        throw new Error('No title');
      }

      const content = await core.http.get<string>(
        `${ENDPOINT}/${encodeURIComponent(title.replaceAll(/\//g, '__'))}`
      );
      setPopoverContent(content);
    } catch (e) {
      setPopoverContent(DEFAULT_UNAVAILABLE_MESSAGE);
    }
  }, [isPopoverOpen, title]);

  return title ? (
    <EuiPopover
      panelPaddingSize="s"
      ownFocus={false}
      button={
        <EuiIcon
          data-test-subj="hostsViewTableColumnPopoverButton"
          type="questionInCircle"
          className={css`
            cursor: pointer;
          `}
          onClick={onButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      offset={10}
      anchorPosition="downCenter"
      panelStyle={{ maxWidth: 550 }}
    >
      {popoverContent ? (
        <Explanation explanation={popoverContent} />
      ) : (
        <EuiLoadingSpinner size="s" />
      )}
    </EuiPopover>
  ) : null;
});

const Explanation = ({ explanation }: { explanation: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(true);

  useLayoutEffect(() => {
    const current = containerRef.current;
    if (current) {
      current.style.setProperty('--truncate-height', `${current.clientHeight}px`);
    }
  }, []);

  const onClick = () => {
    setClamped(!clamped);
  };

  return (
    <>
      <div
        ref={containerRef}
        className={cx({
          [css`
            -webkit-box-orient: vertical;
            display: -webkit-box;
            overflow: hidden;
            text-overflow: ellipsis;
            overflow-wrap: break-word;
            max-height: var(--truncate-height, auto);
            will-change: max-height, -webkit-line-clamp;
            backface-visibility: hidden;
            transition: max-height 0.3s ease-in-out;
          `]: true,
          [css`
            -webkit-line-clamp: 5;
          `]: clamped,
          [css`
            max-height: 500px;
          `]: !clamped,
        })}
      >
        <div ref={innerContentRef}>{explanation}</div>
      </div>
      {DEFAULT_UNAVAILABLE_MESSAGE !== explanation && (
        <>
          <EuiSpacer size="xs" />
          <EuiLink onClick={onClick}>Read {clamped ? 'more' : 'less'}</EuiLink>
        </>
      )}
    </>
  );
};
