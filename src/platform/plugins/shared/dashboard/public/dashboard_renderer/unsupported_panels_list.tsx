/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { euiTextTruncate, type UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';

/** How many panels are named before the rest are counted. */
export const MAX_LISTED_PANELS = 3;

/** Panels that an action can't use: a heading, a few names on one line each, and how many more there are. */
export const UnsupportedPanelsList = ({
  heading,
  panelNames,
}: {
  heading: string;
  panelNames: string[];
}) => {
  const styles = useMemoCss(unsupportedPanelsListStyles);
  const hiddenCount = panelNames.length - MAX_LISTED_PANELS;
  return (
    <div data-test-subj="dashboardUnsupportedPanelsList">
      <div>{heading}</div>
      <ul css={styles.list}>
        {panelNames.slice(0, MAX_LISTED_PANELS).map((name, index) => (
          <li key={index}>
            <div css={styles.panelName} title={name}>
              {name}
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 && (
        <div>
          <FormattedMessage
            id="dashboard.unsupportedPanelsList.morePanels"
            defaultMessage="and {count, plural, one {# more panel} other {# more panels}}"
            values={{ count: hiddenCount }}
          />
        </div>
      )}
    </div>
  );
};

const unsupportedPanelsListStyles = {
  // Doubled selector so the list keeps its look inside EuiText, which styles lists too
  list: ({ euiTheme }: UseEuiTheme) =>
    css({
      // Tooltips and toasts size to their content: the heading sets the width, not the long names
      contain: 'inline-size',
      '&&': {
        listStyle: 'disc',
        margin: `${euiTheme.size.xs} 0`,
        paddingInlineStart: euiTheme.size.l,
      },
    }),
  panelName: css`
    ${euiTextTruncate()}
  `,
};
