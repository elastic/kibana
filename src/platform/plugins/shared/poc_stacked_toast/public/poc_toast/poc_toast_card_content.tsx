/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { EuiButton, EuiLink, type UseEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { POC_STACKED_TOAST_CTA_EVENT } from './poc_toast_events';
import type { PocToast } from './poc_toast_types';
import {
  POC_TOAST_BODY_MAX_CHARS_BEFORE_EXPAND,
  pocToastBodyClampClassName,
  pocToastCtaRowStyles,
  pocToastReadMoreLinkStyles,
} from './poc_toast_styles';

export interface PocToastCardContentProps {
  toast: PocToast;
  euiThemeContext: UseEuiTheme;
}

export const PocToastCardContent = ({ toast, euiThemeContext }: PocToastCardContentProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bodyText = toast.text?.trim();

  const isExpandable = useMemo(
    () => Boolean(bodyText && bodyText.length > POC_TOAST_BODY_MAX_CHARS_BEFORE_EXPAND),
    [bodyText]
  );

  const readMoreLabel = i18n.translate('pocStackedToast.readMore', {
    defaultMessage: 'Read more',
  });
  const showLessLabel = i18n.translate('pocStackedToast.showLess', {
    defaultMessage: 'Show less',
  });

  const handleCtaClick = () => {
    window.dispatchEvent(
      new CustomEvent(POC_STACKED_TOAST_CTA_EVENT, {
        detail: { toastId: toast.id, label: toast.cta?.label ?? '' },
      })
    );
  };

  return (
    <div className="pocToastCardCopy">
      <p className="pocToastCardTitle">{toast.title}</p>
      {bodyText ? (
        <>
          <p
            className={
              isExpandable && !isExpanded
                ? `pocToastCardBody ${pocToastBodyClampClassName}`
                : 'pocToastCardBody'
            }
          >
            {bodyText}
          </p>
          {isExpandable ? (
            <EuiLink
              css={pocToastReadMoreLinkStyles(euiThemeContext)}
              onClick={() => setIsExpanded((expanded) => !expanded)}
              data-test-subj={isExpanded ? 'pocToastShowLess' : 'pocToastReadMore'}
            >
              {isExpanded ? showLessLabel : readMoreLabel}
            </EuiLink>
          ) : null}
        </>
      ) : null}
      {toast.cta ? (
        <div css={pocToastCtaRowStyles(euiThemeContext)}>
          <EuiButton
            size="s"
            color="text"
            onClick={handleCtaClick}
            data-test-subj="pocToastCtaButton"
          >
            {toast.cta.label}
          </EuiButton>
        </div>
      ) : null}
    </div>
  );
};
