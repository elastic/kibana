/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { MaybeViewMore } from './view_more';

const MAX_ARRAY_ITEMS = 200;

type Primitive = string | number | boolean | null | undefined;

const isPrimitive = (value: unknown): value is Primitive =>
  value == null || typeof value !== 'object';

const isInline = (value: unknown): boolean =>
  (isPrimitive(value) && !(typeof value === 'string' && value.includes('\n'))) ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === 'object' && value !== null && Object.keys(value).length === 0);

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    root: css`
      font-family: ${euiTheme.font.familyCode};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      line-height: 1.6;
      overflow-wrap: anywhere;
      white-space: normal;
    `,
    key: css`
      color: ${euiTheme.colors.textPrimary};
      font-weight: ${euiTheme.font.weight.semiBold};
    `,
    keyword: css`
      color: ${euiTheme.colors.textAccent};
    `,
    subdued: css`
      color: ${euiTheme.colors.textSubdued};
    `,
    nested: css`
      padding-left: ${euiTheme.size.m};
    `,
    block: css`
      margin: ${euiTheme.size.xxs} 0 ${euiTheme.size.xs} ${euiTheme.size.m};
      padding-left: ${euiTheme.size.s};
      border-left: ${euiTheme.border.thin};
      white-space: pre-wrap;
    `,
    item: css`
      display: flex;
      gap: ${euiTheme.size.xs};
    `,
    itemBody: css`
      min-width: 0;
      flex: 1;
    `,
  };
};

type Styles = ReturnType<typeof useStyles>;

function InlineValue({ value, styles }: { value: unknown; styles: Styles }) {
  if (value == null) return <span css={styles.subdued}>null</span>;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span css={styles.keyword}>{String(value)}</span>;
  }
  if (Array.isArray(value)) return <span css={styles.subdued}>[]</span>;
  if (typeof value === 'object') return <span css={styles.subdued}>{'{}'}</span>;
  if (value === '') return <span css={styles.subdued}>{'""'}</span>;
  return <span>{String(value)}</span>;
}

function Node({ value, styles }: { value: unknown; styles: Styles }) {
  if (isInline(value)) return <InlineValue value={value} styles={styles} />;
  if (typeof value === 'string') return <div css={styles.block}>{value}</div>;

  if (Array.isArray(value)) {
    const hidden = value.length - MAX_ARRAY_ITEMS;
    return (
      <>
        {value.slice(0, MAX_ARRAY_ITEMS).map((item, i) => (
          <div key={i} css={styles.item}>
            <span css={styles.subdued}>-</span>
            <div css={styles.itemBody}>
              <Node value={item} styles={styles} />
            </div>
          </div>
        ))}
        {hidden > 0 && (
          <div css={styles.subdued}>
            {i18n.translate('apmUiShared.genAi.structuredValue.moreItems', {
              defaultMessage: '… {count} more items',
              values: { count: hidden },
            })}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {Object.entries(value as Record<string, unknown>).map(([key, item]) =>
        isInline(item) ? (
          <div key={key}>
            <span css={styles.key}>{key}:</span> <InlineValue value={item} styles={styles} />
          </div>
        ) : (
          <div key={key}>
            <span css={styles.key}>{key}:</span>
            {typeof item === 'string' ? (
              <Node value={item} styles={styles} />
            ) : (
              <div css={styles.nested}>
                <Node value={item} styles={styles} />
              </div>
            )}
          </div>
        )
      )}
    </>
  );
}

/** Estimates rendered size so long values collapse behind "View more". */
const getSizeEstimate = (value: unknown): string =>
  (JSON.stringify(value, null, 2) ?? '').replace(/\\n/g, '\n');

interface Props {
  value: unknown;
  'data-test-subj'?: string;
}

/** Renders structured data as a readable YAML-like tree with multi-line strings shown verbatim. */
export function GenAiStructuredValue({ value, 'data-test-subj': dataTestSubj }: Props) {
  const styles = useStyles();

  return (
    <MaybeViewMore content={getSizeEstimate(value)}>
      <div css={styles.root} data-test-subj={dataTestSubj ?? 'genAiStructuredValue'}>
        <Node value={value} styles={styles} />
      </div>
    </MaybeViewMore>
  );
}
