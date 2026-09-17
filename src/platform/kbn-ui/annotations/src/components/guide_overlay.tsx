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
import type { Annotation } from '../types';
import { useAnnotations, useAnnotationsState } from './annotations_context';
import { useLayerPortal, useLayerZIndex, useLayoutTick } from './hooks';
import { useResolvedAnchor } from './resolved_anchors';

/** Time the page gets to render before the guide reports the comment as lost. */
const SETTLE_MS = 4000;

interface GuideStep {
  index: number;
  element: Element;
  label: string;
}

/**
 * Latest click of the trail that has not been repeated yet and whose element can
 * be clicked right now. Trails may have been imported, so each step is held to
 * the same standard as when recording: a disclosure control on the page itself.
 */
const findStep = (
  annotation: Annotation,
  done: ReadonlySet<number>,
  ignoreSelectors: readonly string[]
): GuideStep | null => {
  for (let index = annotation.trail.length - 1; index >= 0; index -= 1) {
    const { anchor, label } = annotation.trail[index];
    const element = done.has(index) ? undefined : resolveAnchor(anchor)?.element;
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
export const GuideOverlay = ({ annotation }: { annotation: Annotation }) => {
  const controller = useAnnotations();
  const { euiTheme } = useEuiTheme();
  const zIndex = useLayerZIndex();
  const container = useLayerPortal('kbnUiAnnotationsGuide', zIndex.panel);
  const messageId = useGeneratedHtmlId({ prefix: 'kbnUiAnnotationsGuideMessage' });
  // Another page's DOM could match the anchors by accident.
  const onPage = useAnnotationsState((state) => state.pageKey) === annotation.route.pageKey;
  const [done, setDone] = useState<ReadonlySet<number>>(() => new Set());
  const [settled, setSettled] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);
  const resolved = useResolvedAnchor(annotation.id);
  useLayoutTick();

  const target = onPage ? resolved?.element ?? null : null;
  const step = onPage && !target ? findStep(annotation, done, controller.ignoreSelectors) : null;
  const stepElement = step?.element ?? null;
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, []);

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

  const searching = !step && !settled;
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
          data-test-subj="kbnUiAnnotationsGuideHighlight"
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
        data-test-subj="kbnUiAnnotationsGuide"
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
                ? i18n.translate('kbnUI.annotations.guide.clickStep', {
                    defaultMessage: 'Click “{label}” to get to the comment.',
                    values: { label: step.label },
                  })
                : searching
                ? i18n.translate('kbnUI.annotations.guide.searching', {
                    defaultMessage: 'Looking for the comment…',
                  })
                : i18n.translate('kbnUI.annotations.guide.lost', {
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
              data-test-subj="kbnUiAnnotationsGuideStop"
            >
              {step || searching
                ? i18n.translate('kbnUI.annotations.guide.cancel', { defaultMessage: 'Cancel' })
                : i18n.translate('kbnUI.annotations.guide.backToComments', {
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
