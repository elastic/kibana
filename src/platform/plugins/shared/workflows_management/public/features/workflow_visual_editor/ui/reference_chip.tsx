/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiToolTip, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { LastRunHint } from './last_run_hint';
import { toReferenceIconType } from '../lib/build_data_reference_catalog';
import type { ReferenceChipTone } from '../lib/reference_chip_styles';
import { getReferenceChipCss } from '../lib/reference_chip_styles';

export interface ReferenceChipProps {
  /** The reference without delimiters, e.g. `steps.search.output.hits`. */
  readonly expression: string;
  /** Catalog type of the referenced data; unknown when omitted. */
  readonly typeLabel?: string;
  readonly tone?: ReferenceChipTone;
  /** Hover detail: what the data is and how it is written. */
  readonly hint?: string;
  readonly onClick?: () => void;
  readonly 'data-test-subj'?: string;
}

/**
 * A reference to earlier data, drawn as a neutral box with the type icon before the path.
 * The icon alone is not an accessible name, so the whole chip carries a text label.
 */
export function ReferenceChip({
  expression,
  typeLabel,
  tone = 'neutral',
  hint,
  onClick,
  'data-test-subj': dataTestSubj,
}: ReferenceChipProps) {
  const { euiTheme } = useEuiTheme();
  const { fontSize, lineHeight } = useEuiFontSize('xs');
  const resolvedType = typeLabel ?? 'unknown';
  const ariaLabel = i18n.translate('workflows.stepConfigPanel.referenceChipLabel', {
    defaultMessage: 'Reference {expression}, {type}',
    values: { expression, type: resolvedType },
  });
  const chipCss = {
    ...getReferenceChipCss(euiTheme, tone),
    fontSize,
    lineHeight,
    ...(onClick ? { cursor: 'pointer' } : {}),
  };
  const content = (
    <>
      <span aria-hidden css={{ display: 'inline-flex', flex: '0 0 auto' }}>
        <FieldIcon type={toReferenceIconType(resolvedType)} color="gray" size="s" shape="square" />
      </span>
      <span css={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {expression}
      </span>
    </>
  );
  const chip = onClick ? (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      css={{ ...chipCss, font: 'inherit', fontSize, lineHeight }}
      data-test-subj={dataTestSubj}
      data-tone={tone}
    >
      {content}
    </button>
  ) : (
    <span
      role="img"
      aria-label={ariaLabel}
      css={chipCss}
      data-test-subj={dataTestSubj}
      data-tone={tone}
    >
      {content}
    </span>
  );
  return hint ? (
    // The anchor must be able to shrink with the chip, or a long path can never truncate.
    <EuiToolTip
      content={<LastRunHint hint={hint} expression={expression} />}
      disableScreenReaderOutput
      anchorProps={{
        css: { display: 'inline-flex', minInlineSize: 0, maxInlineSize: '100%' },
      }}
    >
      {chip}
    </EuiToolTip>
  ) : (
    chip
  );
}
