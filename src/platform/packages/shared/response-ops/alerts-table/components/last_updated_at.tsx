/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiText, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';

import { css } from '@emotion/react';
import * as i18n from '../translations';

export interface LastUpdatedAtProps {
  compact?: boolean;
  updatedAt: number;
  showUpdating?: boolean;
}

const Updated = React.memo<{ date: number; prefix: string; updatedAt: number }>(
  ({ date, prefix, updatedAt }) => (
    <>
      {prefix}
      {
        <FormattedRelative
          data-test-subj="last-updated-at-date"
          key={`formatedRelative-${date}`}
          value={new Date(updatedAt)}
        />
      }
    </>
  )
);

Updated.displayName = 'Updated';

const prefix = ` ${i18n.UPDATED} `;

const anchorStyles = {
  css: css`
    align-self: center;
  `,
};

export const LastUpdatedAt = React.memo<LastUpdatedAtProps>(
  ({ compact = false, updatedAt, showUpdating = false }) => {
    const [date, setDate] = useState(Date.now());

    function tick() {
      setDate(Date.now());
    }

    useEffect(() => {
      const timerID = setInterval(() => tick(), 10000);
      return () => {
        clearInterval(timerID);
      };
    }, []);

    const updateText = useMemo(() => {
      if (showUpdating) {
        return <span> {i18n.UPDATING}</span>;
      }

      if (!compact) {
        return <Updated date={date} prefix={prefix} updatedAt={updatedAt} />;
      }

      return null;
    }, [compact, date, showUpdating, updatedAt]);

    return (
      <EuiToolTip
        content={<Updated date={date} prefix={prefix} updatedAt={updatedAt} />}
        anchorProps={anchorStyles}
      >
        <EuiText color="subdued" size="xs" data-test-subj="toolbar-updated-at">
          {updateText}
        </EuiText>
      </EuiToolTip>
    );
  }
);

LastUpdatedAt.displayName = 'LastUpdatedAt';

// eslint-disable-next-line import/no-default-export
export { LastUpdatedAt as default };
