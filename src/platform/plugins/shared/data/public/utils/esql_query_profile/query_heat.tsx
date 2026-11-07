/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiSpacer, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView } from './aggregate_esql_profile';
import { mapOperatorsToCommands } from './map_operators_to_commands';
import type { CommandHeat } from './map_operators_to_commands';
import { splitQueryCommands } from './query_commands';
import { buildQueryProfileHeat } from './query_heat_model';
import { setQueryProfileHeat, useQueryProfileHeat } from './query_heat_store';
import { formatShare } from './query_profile_format';

const HOT_SHARE = 0.5;
const WARM_SHARE = 0.25;
const MAX_COMMAND_LENGTH = 90;

/** Whether the tab has anything to show for this query and profile. */
export function hasQueryHeat(view: QueryProfileView, query: string | undefined): boolean {
  if (!query) {
    return false;
  }
  const heat = mapOperatorsToCommands(splitQueryCommands(query), view.operators);
  return heat.commands.length > 0 && heat.commands.some((entry) => entry.share > 0);
}

const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim();

function CommandRow({ entry, isNested }: { entry: CommandHeat; isNested: boolean }) {
  const { euiTheme } = useEuiTheme();
  const text = oneLine(entry.command.text);
  const isPushedIntoRead = entry.command.name === 'WHERE' && entry.operators.length === 0;
  const color =
    entry.share >= HOT_SHARE
      ? euiTheme.colors.danger
      : entry.share >= WARM_SHARE
      ? euiTheme.colors.warning
      : euiTheme.colors.primary;
  const share = `${entry.isApproximate ? '~' : ''}${formatShare(entry.share)}`;

  const styles = {
    row: css`
      display: grid;
      grid-template-columns: minmax(0, 1fr) ${euiTheme.base * 3}px;
      column-gap: ${euiTheme.size.s};
      padding: ${euiTheme.size.xs} 0;
      padding-inline-start: ${isNested ? euiTheme.size.m : 0};
    `,
    command: css`
      overflow: hidden;
      font-family: ${euiTheme.font.familyCode};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      white-space: nowrap;
      text-overflow: ellipsis;
    `,
    share: css`
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
      font-variant-numeric: tabular-nums;
      font-weight: ${euiTheme.font.weight.bold};
      text-align: end;
    `,
    track: css`
      grid-column: 1 / -1;
      height: ${euiTheme.size.xs};
      margin-block: ${euiTheme.size.xs};
      background: ${euiTheme.colors.backgroundBaseFormsControlDisabled};
      border-radius: ${euiTheme.border.radius.medium};
      overflow: hidden;
    `,
    note: css`
      grid-column: 1 / -1;
      color: ${euiTheme.colors.textSubdued};
      font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
    `,
  };

  return (
    <div css={styles.row} data-test-subj="esqlQueryProfileCommand">
      <EuiToolTip content={entry.command.text} position="top" display="block">
        <div css={styles.command} tabIndex={0}>
          {text.length > MAX_COMMAND_LENGTH ? `${text.slice(0, MAX_COMMAND_LENGTH)}…` : text}
        </div>
      </EuiToolTip>
      <div css={styles.share}>{entry.share > 0 ? share : '–'}</div>
      <div css={styles.track} aria-hidden="true">
        <div
          style={{ width: `${entry.share * 100}%`, height: '100%', background: color }}
          data-test-subj="esqlQueryProfileCommandBar"
        />
      </div>
      {entry.operators.length > 0 ? (
        <div css={styles.note}>{entry.operators.join(', ')}</div>
      ) : isPushedIntoRead ? (
        <div css={styles.note}>
          {i18n.translate('data.inspector.queryProfile.pushedIntoReadNote', {
            defaultMessage: 'No operator of its own. It was likely pushed into the search.',
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Names the query a run of commands belongs to, when a query has subqueries. */
function GroupHeading({ subquery, isFirst }: { subquery?: number; isFirst: boolean }) {
  return (
    <>
      {isFirst ? null : <EuiSpacer size="s" />}
      <EuiText size="xs" data-test-subj="esqlQueryProfileCommandGroup">
        <strong>
          {subquery === undefined
            ? i18n.translate('data.inspector.queryProfile.mainQueryHeading', {
                defaultMessage: 'Outer query',
              })
            : i18n.translate('data.inspector.queryProfile.subqueryHeading', {
                defaultMessage: 'Subquery {number}',
                values: { number: subquery + 1 },
              })}
        </strong>
      </EuiText>
    </>
  );
}

/**
 * The query, one command per row, with the share of the operator CPU time that belongs to it.
 * Operators are matched to commands by type, so it is an approximation.
 */
export function QueryHeat({
  view,
  query,
  canShowOnQuery,
}: {
  view: QueryProfileView;
  query: string;
  /** Whether the query is the one in the editor. Otherwise there is nothing to show it on. */
  canShowOnQuery: boolean;
}) {
  const heat = mapOperatorsToCommands(splitQueryCommands(query), view.operators);
  const shownHeat = useQueryProfileHeat();
  const isShownOnQuery = shownHeat?.query === query;

  return (
    <div data-test-subj="esqlQueryProfileQueryHeat">
      {canShowOnQuery ? (
        <>
          <EuiButtonEmpty
            size="xs"
            flush="left"
            iconType={isShownOnQuery ? 'eyeSlash' : 'eye'}
            onClick={() =>
              setQueryProfileHeat(isShownOnQuery ? undefined : buildQueryProfileHeat(view, query))
            }
            data-test-subj="esqlQueryProfileShowOnQuery"
          >
            {isShownOnQuery
              ? i18n.translate('data.inspector.queryProfile.hideOnQueryButtonLabel', {
                  defaultMessage: 'Hide on query',
                })
              : i18n.translate('data.inspector.queryProfile.showOnQueryButtonLabel', {
                  defaultMessage: 'Show on query',
                })}
          </EuiButtonEmpty>
          <EuiSpacer size="xs" />
        </>
      ) : null}
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="data.inspector.queryProfile.queryHeatDescription"
          defaultMessage="CPU time matched to each command by operator type. This is approximate, because the planner rewrites queries. A ~ marks time shared between similar commands."
        />
      </EuiText>
      <EuiSpacer size="s" />
      {heat.commands.map((entry, index) => (
        <React.Fragment key={`${entry.command.name}-${index}`}>
          {heat.hasSubqueries && entry.subquery !== heat.commands[index - 1]?.subquery ? (
            <GroupHeading subquery={entry.subquery} isFirst={index === 0} />
          ) : null}
          <CommandRow entry={entry} isNested={heat.hasSubqueries && entry.subquery !== undefined} />
        </React.Fragment>
      ))}
      {heat.unattributedShare >= 0.01 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileUnattributed">
            <FormattedMessage
              id="data.inspector.queryProfile.unattributedDescription"
              defaultMessage="{share} of the CPU time is in steps that belong to no command."
              values={{ share: formatShare(heat.unattributedShare) }}
            />
          </EuiText>
        </>
      ) : null}
    </div>
  );
}
