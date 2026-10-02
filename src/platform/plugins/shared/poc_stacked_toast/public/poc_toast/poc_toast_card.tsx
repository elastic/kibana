/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  copyToClipboard,
  EuiButtonIcon,
  EuiIcon,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PocToast } from './poc_toast_types';
import { createPocToastVariants } from './poc_toast_motion';
import { measurePocToastCardSize } from './poc_toast_measure';
import { PocToastCardContent } from './poc_toast_card_content';
import { PocToastCardPeekContent } from './poc_toast_card_peek_content';
import { usePocToastStackLayout } from './poc_toast_stack_layout_context';
import {
  getPocToastMotionCardInteractionClassName,
  getPocToastMotionCardLayoutClassName,
  pocToastCardMeasureHiddenStyles,
  pocToastCardStyles,
} from './poc_toast_styles';

const iconByType: Record<PocToast['type'], IconType> = {
  info: 'info',
  warning: 'warning',
  error: 'error',
};

const colorByType: Record<PocToast['type'], string> = {
  info: 'primary',
  warning: 'warning',
  error: 'danger',
};

export interface PocToastCardProps {
  toast: PocToast;
  index: number;
  arrayLength: number;
  isHovered: boolean;
  onDismiss: (id: string) => void;
}

export const PocToastCard = forwardRef<HTMLDivElement, PocToastCardProps>(function PocToastCard(
  { toast, index, arrayLength, isHovered, onDismiss },
  ref
) {
  const euiThemeContext = useEuiTheme();
  const { frontCardHeight, expandedStackWidth, queueCardMetrics } = usePocToastStackLayout();
  const measureRef = useRef<HTMLElement | null>(null);
  const isFrontCard = index === 0;
  const isPeekCard = !isHovered && index > 0;

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) {
      return;
    }

    const reportSize = () => {
      const intrinsic = measurePocToastCardSize(element);
      const update: { width: number; height: number } = {
        width: intrinsic.width,
        height:
          isHovered && expandedStackWidth !== undefined
            ? measurePocToastCardSize(element, expandedStackWidth).height
            : intrinsic.height,
      };

      queueCardMetrics(toast.id, update);
    };

    reportSize();

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(reportSize);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    expandedStackWidth,
    isHovered,
    queueCardMetrics,
    toast.cta,
    toast.id,
    toast.text,
    toast.title,
  ]);

  const toastVariants = useMemo(
    () =>
      createPocToastVariants({
        isHovered,
        index,
        maxToasts: arrayLength,
      }),
    [arrayLength, index, isHovered]
  );

  const motionCardLayoutClassName = useMemo(
    () => getPocToastMotionCardLayoutClassName(index, isHovered),
    [index, isHovered]
  );

  const motionCardInteractionClassName = useMemo(
    () => getPocToastMotionCardInteractionClassName(index, isHovered),
    [index, isHovered]
  );

  const fullCardChrome = (
    <>
      <div className="pocToastCardLeading">
        <span className="pocToastCardIcon">
          <EuiIcon type={iconByType[toast.type]} color={colorByType[toast.type]} size="m" />
        </span>
        <PocToastCardContent toast={toast} euiThemeContext={euiThemeContext} />
      </div>
      <div className="pocToastCardActions">
        <EuiButtonIcon
          iconType="copy"
          size="xs"
          color="text"
          aria-label={i18n.translate('pocStackedToast.copyToClipboard', {
            defaultMessage: 'Copy to clipboard',
          })}
          onClick={() => copyToClipboard([toast.title, toast.text].filter(Boolean).join('\n'))}
          data-test-subj="pocToastCopyButton"
        />
        <EuiButtonIcon
          iconType="cross"
          size="xs"
          color="text"
          aria-label={i18n.translate('pocStackedToast.dismiss', {
            defaultMessage: 'Dismiss {title}',
            values: { title: toast.title },
          })}
          onClick={() => onDismiss(toast.id)}
          data-test-subj="pocToastDismissButton"
        />
      </div>
    </>
  );

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`${motionCardLayoutClassName} ${motionCardInteractionClassName}`}
      style={isPeekCard ? { height: frontCardHeight } : undefined}
    >
      <article
        css={pocToastCardStyles(
          euiThemeContext,
          toast.type,
          isFrontCard || isHovered,
          isPeekCard,
          expandedStackWidth
        )}
        role="status"
        aria-live={isPeekCard ? 'off' : 'polite'}
        aria-hidden={isPeekCard}
        data-test-subj={`pocToast-${toast.type}`}
      >
        {isPeekCard ? (
          <PocToastCardPeekContent toast={toast} euiThemeContext={euiThemeContext} />
        ) : (
          fullCardChrome
        )}
      </article>
      <div css={pocToastCardMeasureHiddenStyles} aria-hidden>
        <article ref={measureRef} css={pocToastCardStyles(euiThemeContext, toast.type, true, false, undefined)}>
          {fullCardChrome}
        </article>
      </div>
    </motion.div>
  );
});
