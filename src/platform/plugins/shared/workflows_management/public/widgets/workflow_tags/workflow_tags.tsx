/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiBadgeGroup, EuiIcon, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as i18n from '../../../common/translations';

interface WorkflowTagsProps {
  tags: readonly string[] | undefined;
}

const AVERAGE_BADGE_WIDTH = 75;
const GUTTER_SIZE = 4; // xs gutter size in pixels
const OVERFLOW_BADGE_MIN_WIDTH = 40; // Minimum width for "+X" badge
const BADGE_MAX_WIDTH = 150;
const CONTAINER_MAX_WIDTH = '80%';
const POPOVER_MAX_HEIGHT = 200;
const POPOVER_MAX_WIDTH = 600;

/**
 * Calculates how many tags can fit in the available width
 * @param containerWidth - The width of the container in pixels
 * @param totalTags - Total number of tags
 * @returns The number of tags to display before showing the "+X" popover
 */
const calculateVisibleTagsCount = (containerWidth: number, totalTags: number): number => {
  if (containerWidth <= 0 || totalTags === 0) return 0;
  if (totalTags === 1) return 1;

  const estimatedTagWidth = AVERAGE_BADGE_WIDTH + GUTTER_SIZE;
  const overflowBadgeWidth = OVERFLOW_BADGE_MIN_WIDTH + GUTTER_SIZE;
  const maxTagsWithoutOverflow = Math.floor(containerWidth / estimatedTagWidth);

  if (maxTagsWithoutOverflow >= totalTags) {
    return totalTags;
  }

  const availableWidth = containerWidth - overflowBadgeWidth;
  if (availableWidth <= 0) {
    return 0;
  }
  const maxTagsWithOverflow = Math.floor(availableWidth / estimatedTagWidth);
  return Math.max(0, maxTagsWithOverflow);
};

/**
 * Hook to calculate visible tags count based on container width
 * Uses ResizeObserver to recalculate when container size changes
 * @param totalTags - Total number of tags
 * @returns Tuple of [visibleTagsCount, containerRef]
 */
const useVisibleTagsCount = (totalTags: number): [number, React.RefObject<HTMLDivElement>] => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const [visibleTagsCount, setVisibleTagsCount] = useState(totalTags);

  useLayoutEffect(() => {
    isMountedRef.current = true;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateVisibleCount = () => {
      if (!isMountedRef.current) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const width = rect.width;

      // Only calculate if we have a valid width
      if (width > 0) {
        const count = calculateVisibleTagsCount(width, totalTags);
        setVisibleTagsCount(count);
      }
    };

    const rafId = requestAnimationFrame(() => {
      updateVisibleCount();
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateVisibleCount);
    });

    resizeObserver.observe(container);

    return () => {
      isMountedRef.current = false;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [totalTags]);

  return [visibleTagsCount, containerRef];
};

export const WorkflowTags = ({ tags }: WorkflowTagsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const totalTags = tags?.length ?? 0;
  const [visibleTagsCount, containerRef] = useVisibleTagsCount(totalTags);

  const togglePopover = useCallback(() => {
    setIsPopoverOpen((prev) => !prev);
  }, []);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const { visibleTags, restOfTags } = useMemo(() => {
    if (!tags || tags.length === 0) {
      return { visibleTags: [], restOfTags: [] };
    }
    return {
      visibleTags: tags.slice(0, visibleTagsCount),
      restOfTags: tags.slice(visibleTagsCount),
    };
  }, [tags, visibleTagsCount]);

  const popoverContent = useMemo(
    () => (
      <>
        <EuiPopoverTitle>{i18n.TAGS_LIST_TITLE}</EuiPopoverTitle>
        <EuiBadgeGroup
          gutterSize="xs"
          css={css`
            max-height: ${POPOVER_MAX_HEIGHT}px;
            max-width: ${POPOVER_MAX_WIDTH}px;
            overflow: auto;
          `}
        >
          {tags?.map((tag) => (
            <EuiBadge key={tag} color="hollow" data-test-subj="workflow-tag-popover">
              {tag}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      </>
    ),
    [tags]
  );
  if (!tags || tags.length === 0) return null;

  const hasOverflow = restOfTags.length > 0;
  const showIconOnly = visibleTagsCount === 0 && hasOverflow;

  return (
    <div
      ref={containerRef}
      css={css`
        max-width: ${CONTAINER_MAX_WIDTH};
        width: 100%;
        display: inline-block;
      `}
    >
      <EuiBadgeGroup
        gutterSize="xs"
        css={css`
          flex-wrap: nowrap;
        `}
      >
        {visibleTags.map((tag) => (
          <EuiBadge
            key={tag}
            color="hollow"
            css={css`
              max-width: ${BADGE_MAX_WIDTH}px;
              overflow: hidden;
              text-overflow: ellipsis;
            `}
          >
            {tag}
          </EuiBadge>
        ))}
        {hasOverflow && (
          <EuiPopover
            ownFocus
            css={css`
              display: inline-flex;
              align-items: center;
            `}
            button={
              <EuiBadge
                color="hollow"
                onClick={togglePopover}
                onClickAriaLabel={i18n.TAGS_LIST_TITLE}
              >
                {showIconOnly ? (
                  <>
                    <EuiIcon
                      type="tag"
                      size="s"
                      css={css`
                        margin-right: 4px;
                      `}
                    />
                    {restOfTags.length.toString()}
                  </>
                ) : (
                  `+${restOfTags.length.toString()}`
                )}
              </EuiBadge>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            repositionOnScroll
          >
            {popoverContent}
          </EuiPopover>
        )}
      </EuiBadgeGroup>
    </div>
  );
};
