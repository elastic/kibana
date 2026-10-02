/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, memo, useMemo } from 'react';
import { motion, useIsPresent } from 'framer-motion';
import {
  copyToClipboard,
  EuiButtonIcon,
  EuiIcon,
  EuiToolTip,
  useEuiTheme,
  type IconType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { PocToast } from './poc_toast_types';
import { createPocToastVariants } from './poc_toast_motion';
import { PocToastCardContent } from './poc_toast_card_content';
import { PocToastCardPeekContent } from './poc_toast_card_peek_content';
import {
  getPocToastMotionCardInteractionClassName,
  getPocToastMotionCardLayoutClassName,
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

const PocToastCardComponent = forwardRef<HTMLDivElement, PocToastCardProps>(function PocToastCard(
  { toast, index, arrayLength, isHovered, onDismiss },
  ref
) {
  const euiThemeContext = useEuiTheme();
  const isPresent = useIsPresent();
  const isFrontCard = index === 0;
  const isPeekCard = !isHovered && index > 0;
  const useSolidBackground = isFrontCard || isHovered;

  const toastVariants = useMemo(
    () => createPocToastVariants({ isHovered, index, maxToasts: arrayLength }),
    [arrayLength, index, isHovered]
  );

  const motionClassName = useMemo(
    () =>
      `${getPocToastMotionCardLayoutClassName(
        index,
        isHovered,
        isPresent
      )} ${getPocToastMotionCardInteractionClassName(index, isHovered)}`,
    [index, isHovered, isPresent]
  );

  const copyLabel = i18n.translate('pocStackedToast.copyToClipboard', {
    defaultMessage: 'Copy to clipboard',
  });
  const dismissLabel = i18n.translate('pocStackedToast.dismiss', {
    defaultMessage: 'Dismiss {title}',
    values: { title: toast.title },
  });

  const cardStyles = useMemo(
    () => pocToastCardStyles(euiThemeContext, toast.type, useSolidBackground, isPeekCard),
    [euiThemeContext, isPeekCard, toast.type, useSolidBackground]
  );

  return (
    <motion.div
      ref={ref}
      custom={index}
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={motionClassName}
    >
      <article
        css={cardStyles}
        role="status"
        aria-live={isPeekCard ? 'off' : 'polite'}
        aria-hidden={isPeekCard}
        data-test-subj={`pocToast-${toast.type}`}
      >
        {isPeekCard ? (
          <PocToastCardPeekContent toast={toast} euiThemeContext={euiThemeContext} />
        ) : (
          <>
            <div className="pocToastCardLeading">
              <span className="pocToastCardIcon">
                <EuiIcon
                  type={iconByType[toast.type]}
                  color={colorByType[toast.type]}
                  size="m"
                  aria-hidden={true}
                />
              </span>
              <PocToastCardContent toast={toast} euiThemeContext={euiThemeContext} />
            </div>
            <div className="pocToastCardActions">
              <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copy"
                  size="xs"
                  color="text"
                  aria-label={copyLabel}
                  onClick={() =>
                    copyToClipboard([toast.title, toast.text].filter(Boolean).join('\n'))
                  }
                  data-test-subj="pocToastCopyButton"
                />
              </EuiToolTip>
              <EuiToolTip content={dismissLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  color="text"
                  aria-label={dismissLabel}
                  onClick={() => onDismiss(toast.id)}
                  data-test-subj="pocToastDismissButton"
                />
              </EuiToolTip>
            </div>
          </>
        )}
      </article>
    </motion.div>
  );
});

export const PocToastCard = memo(PocToastCardComponent);
