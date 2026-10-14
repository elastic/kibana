/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useMemo } from 'react';
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
import type { PocToast, PocToastType } from './poc_toast_types';
import { createPocToastVariants } from './poc_toast_motion';
import { PocToastCardContent } from './poc_toast_card_content';
import { getPocToastCardMotionClassName, pocToastCardStyles } from './poc_toast_styles';

const iconByType: Record<PocToastType, { type: IconType; color: string }> = {
  info: { type: 'info', color: 'primary' },
  warning: { type: 'warning', color: 'warning' },
  error: { type: 'error', color: 'danger' },
};

const copyLabel = i18n.translate('pocStackedToast.copyToClipboard', {
  defaultMessage: 'Copy to clipboard',
});

export interface PocToastCardProps {
  toast: PocToast;
  index: number;
  isExpanded: boolean;
  onDismiss: (id: string) => void;
}

export const PocToastCard = memo(function PocToastCard({
  toast,
  index,
  isExpanded,
  onDismiss,
}: PocToastCardProps) {
  const euiThemeContext = useEuiTheme();
  const isPresent = useIsPresent();
  const isPeekCard = !isExpanded && index > 0;
  const { type, title, text } = toast;

  const variants = useMemo(() => createPocToastVariants(index, isExpanded), [index, isExpanded]);
  const motionClassName = useMemo(
    () => getPocToastCardMotionClassName(index, isExpanded, isPresent),
    [index, isExpanded, isPresent]
  );
  const cardStyles = useMemo(
    () => pocToastCardStyles(euiThemeContext, type, isPeekCard),
    [euiThemeContext, isPeekCard, type]
  );

  const dismissLabel = i18n.translate('pocStackedToast.dismiss', {
    defaultMessage: 'Dismiss {title}',
    values: { title },
  });

  return (
    <motion.div
      variants={variants}
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
        data-test-subj={`pocToast-${type}`}
      >
        <div
          className={isPeekCard ? 'pocToastCardLeading pocToastCardPeek' : 'pocToastCardLeading'}
        >
          <span className="pocToastCardIcon">
            <EuiIcon
              type={iconByType[type].type}
              color={iconByType[type].color}
              size="m"
              aria-hidden={true}
            />
          </span>
          {isPeekCard ? (
            <p className="pocToastCardTitle">{title}</p>
          ) : (
            <PocToastCardContent toast={toast} />
          )}
        </div>
        {isPeekCard ? null : (
          <div className="pocToastCardActions">
            <EuiToolTip content={copyLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="copy"
                size="xs"
                color="text"
                aria-label={copyLabel}
                onClick={() => copyToClipboard([title, text].filter(Boolean).join('\n'))}
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
        )}
      </article>
    </motion.div>
  );
});
