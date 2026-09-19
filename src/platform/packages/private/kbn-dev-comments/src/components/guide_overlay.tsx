/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { css, keyframes } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isActionable, isIgnored, resolveAnchor } from '../lib/anchor';
import { isTrailControl } from '../lib/trail';
import type { Comment } from '../types';
import { useComments, useCommentsState } from './comments_context';
import { useLayerPortal, useLayerZIndex, useLayoutTick } from './hooks';
import { useResolvedAnchor } from './resolved_anchors';

/** Time the page gets to render, on arrival and after each step, before the guide reports the comment as lost. */
const SETTLE_MS = 4000;

interface GuideStep {
  index: number;
  element: Element;
  label: string;
}

/**
 * Latest click of the trail that has not been repeated yet and whose element can
 * be clicked right now. Trails are stored data, so each step is held to the
 * same standard as when recording: a disclosure control on the page itself,
 * and the recorded one. An element that only stands where it stood, with other
 * content, may be any control, so the guide does not ask for a click on it.
 */
const findStep = (
  comment: Comment,
  done: ReadonlySet<number>,
  ignoreSelectors: readonly string[]
): GuideStep | null => {
  for (let index = comment.trail.length - 1; index >= 0; index -= 1) {
    const { anchor, label } = comment.trail[index];
    const resolved = done.has(index) ? null : resolveAnchor(anchor);
    const element = resolved?.exact ? resolved.element : undefined;
    if (
      element &&
      isTrailControl(element) &&
      !isIgnored(element, ignoreSelectors) &&
      isActionable(element)
    ) {
      return { index, element, label };
    }
  }
  return null;
};

const pulse = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0.55;
  }
`;

/** Highlights the author's clicks one at a time, most recent first, until the commented element appears, then opens the comment. */
export const GuideOverlay = ({ comment }: { comment: Comment }) => {
  const controller = useComments();
  const { euiTheme } = useEuiTheme();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('devCommentsGuide', zIndex.panel);
  const messageId = useGeneratedHtmlId({ prefix: 'devCommentsGuideMessage' });
  // Another page's DOM could match the anchors by accident, as could this page's
  // in another state while the host is still opening the comment's one.
  const navigating = useCommentsState((state) => state.guide?.navigating ?? false);
  const pageKey = useCommentsState((state) => state.pageKey);
  const onPage = !navigating && pageKey === comment.route.pageKey;
  const [done, setDone] = useState<ReadonlySet<number>>(() => new Set());
  const [settled, setSettled] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const resolved = useResolvedAnchor(comment.id);
  useLayoutTick();

  const target = onPage ? resolved?.element ?? null : null;
  const step = onPage && !target ? findStep(comment, done, controller.ignoreSelectors) : null;
  const stepElement = step?.element ?? null;
  const stepRef = useRef(step);
  stepRef.current = step;

  // The render window opens anew whenever the scene changes: on arriving at the
  // page and after each completed step, whose UI may take a moment to appear.
  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [onPage, done]);

  useEffect(() => {
    if (target) {
      target.scrollIntoView({ block: 'center', inline: 'nearest' });
      controller.stopGuide(true);
    }
  }, [target, controller]);

  // Focus follows the guide: the control to activate (Enter then repeats the
  // click), otherwise the guide's own button, described by the message.
  useEffect(() => {
    if (stepElement) {
      stepElement.scrollIntoView({ block: 'center', inline: 'nearest' });
      if (stepElement instanceof HTMLElement) {
        stepElement.focus({ preventScroll: true });
      }
    } else {
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, [stepElement]);

  // Only a real click completes a step: keyboard activation of a control fires one as well.
  useEffect(() => {
    const onClick = ({ target: activated }: MouseEvent) => {
      const current = stepRef.current;
      if (current && activated instanceof Node && current.element.contains(activated)) {
        setDone((previous) => new Set([...previous, current.index]));
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!container || target) {
    return null;
  }

  const searching = navigating || (!step && !settled);
  const rect = stepElement?.getBoundingClientRect();
  const padding = parseInt(euiTheme.size.xs, 10);

  return createPortal(
    <>
      {rect && (
        <div
          css={css`
            position: fixed;
            left: ${rect.left - padding}px;
            top: ${rect.top - padding}px;
            width: ${rect.width + 2 * padding}px;
            height: ${rect.height + 2 * padding}px;
            border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
            border-radius: ${euiTheme.border.radius.small};
            box-shadow: 0 0 0 ${euiTheme.size.xs} ${euiTheme.colors.backgroundLightPrimary};
            pointer-events: none;
            ${euiCanAnimate} {
              animation: ${pulse} 0.8s ease-in-out infinite alternate;
            }
          `}
          data-test-subj="devCommentsGuideHighlight"
        />
      )}
      <EuiPanel
        paddingSize="s"
        hasShadow
        css={css`
          position: fixed;
          left: 50%;
          bottom: ${euiTheme.size.xxxl};
          transform: translateX(-50%);
          width: 480px;
          max-width: calc(100vw - ${euiTheme.size.xl});
          pointer-events: auto;
        `}
        data-test-subj="devCommentsGuide"
      >
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {searching ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <EuiIcon
                type={step ? 'waypoint' : 'warning'}
                color={step ? 'primary' : 'warning'}
                aria-hidden={true}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" id={messageId} role="status">
              {step
                ? i18n.translate('devComments.guide.clickStep', {
                    defaultMessage: 'Click “{label}” to get to the comment.',
                    values: { label: step.label },
                  })
                : searching
                ? i18n.translate('devComments.guide.searching', {
                    defaultMessage: 'Looking for the comment…',
                  })
                : i18n.translate('devComments.guide.lost', {
                    defaultMessage:
                      'The commented element cannot be found: the UI may have changed since the comment was made.',
                  })}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              buttonRef={buttonRef}
              aria-describedby={messageId}
              onClick={() => controller.stopGuide()}
              data-test-subj="devCommentsGuideStop"
            >
              {step || searching
                ? i18n.translate('devComments.guide.cancel', { defaultMessage: 'Cancel' })
                : i18n.translate('devComments.guide.backToComments', {
                    defaultMessage: 'Back to comments',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>,
    container
  );
};
