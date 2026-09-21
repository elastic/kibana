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
import { isActionable, isCovered, isIgnored, resolveAnchor } from '../lib/anchor';
import { isTrailControl } from '../lib/trail';
import type { Comment } from '../types';
import { useComments, useCommentsState } from './comments_context';
import { useLayerPortal, useLayerZIndex, useLayoutTick } from './hooks';
import { useResolvedAnchor } from './resolved_anchors';

/** Time the page gets to render, on arrival and after each step, before the guide reports the comment as lost or covered. */
export const SETTLE_MS = 4000;

interface GuideStep {
  index: number;
  element: Element;
  label: string;
}

interface StepSearch {
  /** The click to ask for: the latest one not repeated yet whose element can be clicked right now. */
  step: GuideStep | null;
  /** Failing that, the latest such click whose element is there but under other UI, for the message to name. */
  covered: GuideStep | null;
}

const NO_STEP: StepSearch = { step: null, covered: null };

/**
 * The click to ask for next, latest first: the one closest to the comment that
 * can be made is the likeliest to bring its element up, and clicks before it
 * that opened and closed other things are left alone. Trails are stored data,
 * so each step is held to the same standard as when recording: a disclosure
 * control on the page itself, and the recorded one. An element that only stands
 * where it stood, with other content, may be any control, so the guide does not
 * ask for a click on it.
 */
const findStep = (
  comment: Comment,
  done: ReadonlySet<number>,
  ignoreSelectors: readonly string[]
): StepSearch => {
  let covered: GuideStep | null = null;
  for (let index = comment.trail.length - 1; index >= 0; index -= 1) {
    const { anchor, label } = comment.trail[index];
    const resolved = done.has(index) ? null : resolveAnchor(anchor);
    const element = resolved?.exact ? resolved.element : undefined;
    if (!element || !isTrailControl(element) || isIgnored(element, ignoreSelectors)) {
      continue;
    }
    if (isActionable(element)) {
      return { step: { index, element, label }, covered };
    }
    covered ??= isCovered(element) ? { index, element, label } : null;
  }
  return { step: null, covered };
};

/**
 * The steps done once `index` is: it and the ones before it that were, not the
 * ones after it. A click made before an earlier one is asked for again after
 * that one, as what it brought up may have depended on the state the earlier
 * click put the page in (a flyout showing the selected tab's content) — the
 * author made them in that order.
 */
const completing = (done: ReadonlySet<number>, index: number): ReadonlySet<number> =>
  new Set([...done].filter((earlier) => earlier < index).concat(index));

const pulse = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0.55;
  }
`;

/**
 * Highlights the author's clicks one at a time, most recent first, until the
 * commented element shows, then opens the comment. A click that turns out to
 * need an earlier one is asked for again after it, see `completing`.
 */
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
  const placed = useResolvedAnchor(comment.id);
  useLayoutTick();

  // The element, once on the page, and once it shows: a dialog or menu over it has to go first.
  const found = onPage ? placed : null;
  const target = found?.exposed ? found.element : null;
  const { step, covered: coveredStep } =
    onPage && !target ? findStep(comment, done, controller.ignoreSelectors) : NO_STEP;
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

  // Into view as soon as it is found, which is out from under a bar it may have scrolled beneath.
  const foundElement = found?.element ?? null;
  useEffect(() => {
    foundElement?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [foundElement]);

  useEffect(() => {
    if (target) {
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
        setDone((previous) => completing(previous, current.index));
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  if (!container || target) {
    return null;
  }

  const searching = navigating || (!step && !settled);
  // The element, or the way to it, is under other UI.
  const covered = !searching && !step && (found !== null || coveredStep !== null);
  const rect = stepElement?.getBoundingClientRect();
  const padding = parseInt(euiTheme.size.xs, 10);

  const message = step
    ? i18n.translate('devComments.guide.clickStep', {
        defaultMessage: 'Click “{label}” to get to the comment',
        values: { label: step.label },
      })
    : searching
    ? i18n.translate('devComments.guide.searching', {
        defaultMessage: 'Looking for the comment…',
      })
    : found
    ? i18n.translate('devComments.guide.covered', {
        defaultMessage:
          'The commented element is behind other UI, like a dialog or menu: close it to get to the comment.',
      })
    : coveredStep
    ? i18n.translate('devComments.guide.stepCovered', {
        defaultMessage:
          '“{label}” is behind other UI, like a dialog or menu: close it to get to the comment.',
        values: { label: coveredStep.label },
      })
    : i18n.translate('devComments.guide.lost', {
        defaultMessage:
          'The commented element cannot be found: the UI may have changed since the comment was made.',
      });

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
                type={step ? 'waypoint' : covered ? 'eyeSlash' : 'warning'}
                color={step ? 'primary' : 'warning'}
                aria-hidden={true}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" id={messageId} role="status">
              {message}
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
              {step || searching || covered
                ? i18n.translate('devComments.guide.cancel', { defaultMessage: 'Cancel' })
                : i18n.translate('devComments.guide.backToComments', {
                    defaultMessage: 'Return to comments',
                  })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>,
    container
  );
};
