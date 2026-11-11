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
import { EuiSpacer, EuiText, type UseEuiTheme } from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import type { MountPoint } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { panelJsonStrings } from '../../panel_json/_panel_json_strings';
import { coreServices } from '../../services/kibana_services';
import { UnsupportedPanelsList } from '../unsupported_panels_list';

const componentStyles = {
  // Ends the truncated names where the close button of the toast starts
  skippedPanels: ({ euiTheme }: UseEuiTheme) => css({ paddingInlineEnd: euiTheme.size.l }),
};

/** Text of the copy toast: the panels that weren't copied and the sanitize warnings. */
export const CopiedPanelsWarning = ({
  skippedPanelNames,
  warningCount,
}: {
  skippedPanelNames: string[];
  warningCount: number;
}) => {
  const styles = useMemoCss(componentStyles);
  const skippedCount = skippedPanelNames.length;
  return (
    <EuiText size="s">
      {skippedCount > 0 && (
        <div css={styles.skippedPanels}>
          <UnsupportedPanelsList
            heading={panelJsonStrings.getPanelsNotCopiedHeading(skippedCount)}
            panelNames={skippedPanelNames}
          />
        </div>
      )}
      {skippedCount > 0 && warningCount > 0 && <EuiSpacer size="s" />}
      {warningCount > 0 && <p>{panelJsonStrings.getWarningsSummary(warningCount)}</p>}
    </EuiText>
  );
};

export const getCopiedPanelsWarningText = (props: {
  skippedPanelNames: string[];
  warningCount: number;
}): MountPoint => toMountPoint(<CopiedPanelsWarning {...props} />, coreServices.rendering);
