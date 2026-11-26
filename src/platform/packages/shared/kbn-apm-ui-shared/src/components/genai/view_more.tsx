/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonEmpty, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';

const MAX_HEIGHT = 300;

interface Props {
  /** Optional descriptor used to make data-test-subj and aria-label unique across multiple instances. */
  label?: string;
  children: React.ReactNode;
}

export function ViewMore({ label, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { euiTheme } = useEuiTheme();

  const testSubj = label ? `apmViewMoreLink-${label}` : 'apmViewMoreLink';
  const ariaLabel = expanded
    ? i18n
        .translate('apmUiShared.genAi.viewMore.viewLessLabel', {
          defaultMessage: 'View less {label}',
          values: { label: label ?? '' },
        })
        .trim()
    : i18n
        .translate('apmUiShared.genAi.viewMore.viewMoreLabel', {
          defaultMessage: 'View more {label}',
          values: { label: label ?? '' },
        })
        .trim();

  return (
    <>
      <div
        style={
          expanded ? undefined : { maxHeight: MAX_HEIGHT, overflow: 'hidden', position: 'relative' }
        }
      >
        {children}
        {!expanded && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: euiTheme.size.xxl,
              background: `linear-gradient(transparent, ${euiTheme.colors.backgroundBasePlain})`,
            }}
          />
        )}
      </div>
      <EuiSpacer size="xs" />
      <EuiButtonEmpty
        size="xs"
        flush="left"
        data-test-subj={testSubj}
        aria-label={ariaLabel}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded
          ? i18n.translate('apmUiShared.genAi.viewMore.viewLess', { defaultMessage: 'View less' })
          : i18n.translate('apmUiShared.genAi.viewMore.viewMore', { defaultMessage: 'View more' })}
      </EuiButtonEmpty>
    </>
  );
}

/** Wraps content in ViewMore only when the estimated height would exceed the threshold. */
export function MaybeViewMore({
  content,
  label,
  children,
}: {
  content: string;
  /** Forwarded to ViewMore for unique data-test-subj / aria-label. */
  label?: string;
  children: React.ReactNode;
}) {
  // Dual heuristic: take the larger of line-count-based and char-wrap-based estimates.
  // Line-count handles code/JSON where each short line still occupies a full row.
  // Char-based handles long prose that wraps at ~60 chars.
  // Both multiply by 18 px/line.
  const newlineLines = (content.match(/\n/g) ?? []).length + 1;
  const charLines = Math.ceil(content.length / 60);
  const estimatedHeight = Math.max(newlineLines, charLines) * 18;
  if (estimatedHeight <= MAX_HEIGHT) return <>{children}</>;
  return <ViewMore label={label}>{children}</ViewMore>;
}
