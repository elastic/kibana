/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiButton, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { POC_STACKED_TOAST_CTA_EVENT } from './poc_toast_events';
import type { PocToast } from './poc_toast_types';

/** Bodies longer than this are clamped to two lines with a "Read more" toggle. */
const BODY_MAX_CHARS_BEFORE_EXPAND = 120;

const readMoreLabel = i18n.translate('pocStackedToast.readMore', {
  defaultMessage: 'Read more',
});
const showLessLabel = i18n.translate('pocStackedToast.showLess', {
  defaultMessage: 'Show less',
});

export const PocToastCardContent = ({ toast }: { toast: PocToast }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const bodyText = toast.text?.trim();
  const isExpandable = Boolean(bodyText && bodyText.length > BODY_MAX_CHARS_BEFORE_EXPAND);
  const isClamped = isExpandable && !isExpanded;

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
        <p className={isClamped ? 'pocToastCardBody pocToastCardBodyClamped' : 'pocToastCardBody'}>
          {bodyText}
        </p>
      ) : null}
      {isExpandable ? (
        <EuiLink
          className="pocToastCardReadMore"
          onClick={() => setIsExpanded((expanded) => !expanded)}
          data-test-subj={isExpanded ? 'pocToastShowLess' : 'pocToastReadMore'}
        >
          {isExpanded ? showLessLabel : readMoreLabel}
        </EuiLink>
      ) : null}
      {toast.cta ? (
        <div className="pocToastCardCta">
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
