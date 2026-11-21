/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiProgress, EuiSpacer, EuiText, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView } from '../profile/types';
import { mapOperatorsToCommands } from './map_operators_to_commands';
import type { CommandHeat, QueryHeat } from './map_operators_to_commands';
import { splitQueryCommands } from './query_commands';
import { formatShare } from '../shared/profile_format';
import { heatLevel } from '../shared/profile_heat';

/** Time in steps that belong to no command is only mentioned when it is at least this share. */
const MIN_UNATTRIBUTED_SHARE = 0.01;

/** The share of the operator time that belongs to each command of the query. */
export const computeCommandHeat = (view: QueryProfileView, query: string): QueryHeat =>
  mapOperatorsToCommands({
    query,
    commands: splitQueryCommands(query),
    operators: view.operators,
    planNodeSources: view.planNodeSources,
  });

/** Whether the tab has anything to show for this query and profile. */
export const hasCommandBreakdown = (heat: QueryHeat | undefined): boolean =>
  heat?.commands.some((entry) => entry.share > 0) ?? false;

const HEAT_COLOR = { hot: 'danger', warm: 'warning', cool: 'primary' } as const;

const useCommandStyles = () => {
  const { euiTheme } = useEuiTheme();
  const { fontSize: small } = useEuiFontSize('xs');

  return useMemo(
    () => ({
      row: css`
        display: grid;
        grid-template-columns: minmax(0, 1fr) ${euiTheme.base * 3}px;
        column-gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.s} 0;
      `,
      nested: css`
        padding-inline-start: ${euiTheme.size.m};
      `,
      command: css`
        font-family: ${euiTheme.font.familyCode};
        font-size: ${small};
        /* The command as it was written, wrapped but not changed: spaces inside a string count. */
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      `,
      share: css`
        font-size: ${small};
        font-variant-numeric: tabular-nums;
        font-weight: ${euiTheme.font.weight.bold};
        text-align: end;
      `,
      bar: css`
        grid-column: 1 / -1;
        margin-block: ${euiTheme.size.xs};
      `,
      note: css`
        grid-column: 1 / -1;
        color: ${euiTheme.colors.textSubdued};
        font-size: ${small};
      `,
    }),
    [euiTheme, small]
  );
};

const CommandRow = ({ entry, isNested }: { entry: CommandHeat; isNested: boolean }) => {
  const styles = useCommandStyles();
  const note =
    entry.operators.length > 0
      ? entry.operators.join(', ')
      : i18n.translate('data.inspector.queryProfile.noOperatorOfItsOwnNote', {
          defaultMessage:
            'No operator of its own. The planner may have merged it into another step, such as the search.',
        });

  return (
    <div
      css={[styles.row, isNested ? styles.nested : undefined]}
      data-test-subj="esqlQueryProfileCommand"
    >
      <div css={styles.command}>{entry.command.text}</div>
      <div css={styles.share}>{entry.share > 0 ? formatShare(entry.share) : '–'}</div>
      <div css={styles.bar} aria-hidden="true">
        <EuiProgress
          value={entry.share * 100}
          max={100}
          size="s"
          color={HEAT_COLOR[heatLevel(entry.share)]}
          data-test-subj="esqlQueryProfileCommandBar"
        />
      </div>
      <div css={styles.note}>{note}</div>
    </div>
  );
};

/** Names the query a run of commands belongs to, when a query has subqueries. */
const GroupHeading = ({ subquery, isFirst }: { subquery?: number; isFirst: boolean }) => (
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

/** The query, one command per row, with the share of the operator time that belongs to it. */
export const ByCommandTab = ({ heat }: { heat: QueryHeat }) => {
  return (
    <div data-test-subj="esqlQueryProfileByCommand">
      <EuiText size="xs" color="subdued">
        <p>
          <FormattedMessage
            id="data.inspector.queryProfile.byCommandDescription"
            defaultMessage="Time of the operators that Elasticsearch built for each command. The planner can merge a command into another step, such as a filter into the search, so a command can show little time."
          />
        </p>
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
      {heat.unattributedShare >= MIN_UNATTRIBUTED_SHARE ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileUnattributed">
            <p>
              <FormattedMessage
                id="data.inspector.queryProfile.unattributedDescription"
                defaultMessage="{share} of the operator time is in steps that belong to no command."
                values={{ share: formatShare(heat.unattributedShare) }}
              />
            </p>
          </EuiText>
        </>
      ) : null}
    </div>
  );
};
