/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AnalyticsMock, TelemetryEvent } from './analytics_mock';

export const TelemetryEventsPanel: React.FC<{ mock: AnalyticsMock }> = ({ mock }) => {
  const [events, setEvents] = useState<TelemetryEvent[]>(mock.getEvents());
  const { euiTheme } = useEuiTheme();

  useEffect(() => {
    return mock.subscribe(setEvents);
  }, [mock]);

  const panelStyles = css({
    marginTop: euiTheme.size.l,
    padding: euiTheme.size.l,
    border: `${euiTheme.border.thin} ${euiTheme.colors.lightShade}`,
    borderRadius: euiTheme.size.s,
    background: euiTheme.colors.emptyShade,
  });

  const headerStyles = css({
    display: 'flex',
    alignItems: 'center',
    gap: euiTheme.size.s,
  });

  const emptyStyles = css({
    opacity: 0.6,
    marginTop: euiTheme.size.s,
  });

  const listStyles = css({
    marginTop: euiTheme.size.s,
  });

  const itemStyles = css({
    fontFamily: 'monospace',
    fontSize: 12,
  });

  return (
    <div css={panelStyles}>
      <div css={headerStyles}>
        <strong>Reported telemetry payloads</strong>
        <button onClick={() => mock.clear()}>Clear</button>
      </div>
      {events.length === 0 ? (
        <div css={emptyStyles}>No telemetry reported yet</div>
      ) : (
        <ol css={listStyles}>
          {events.map((e, idx) => (
            <li key={`${e.at}-${idx}`}>
              <div css={itemStyles}>
                <div>
                  <strong>type:</strong> {e.type}
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(clipComponentStack(e.payload as object), null, 2)}
                </pre>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

const propsToTrim = ['component_stack', 'error_stack'];
function clipComponentStack(payload: object): object {
  if (typeof payload !== 'object' || payload === null) {
    return payload;
  }
  const cloned = { ...payload } as Record<string, any>;
  for (const prop of propsToTrim) {
    if (typeof cloned[prop] === 'string' && cloned[prop].length > 100) {
      cloned[prop] = cloned[prop].slice(0, 100) + '...';
    }
  }
  return cloned;
}
