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
import type { UseEuiTheme } from '@elastic/eui';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import type { PanelSettingsAccordionsProps } from './panel_settings_accordions';
import { PanelSettingsAccordions } from './panel_settings_accordions';

export type PanelSettingsFlyoutSectionsProps = Omit<PanelSettingsAccordionsProps, 'sectionCss'> & {
  /** Set when the sections are the first content of the flyout body */
  isFirstInFlyoutBody?: boolean;
};

/**
 * The panel settings accordions, laid out for the body of a flyout with the default padding:
 * like in the Lens flyout, the section borders go all the way to the edges of the flyout.
 */
export const PanelSettingsFlyoutSections = ({
  isFirstInFlyoutBody = false,
  ...props
}: PanelSettingsFlyoutSectionsProps) => {
  const euiThemeContext = useEuiTheme();
  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={[styles.sections, isFirstInFlyoutBody && styles.firstInFlyoutBody]}
      data-test-subj="panelSettingsFlyoutSections"
    >
      <PanelSettingsAccordions {...props} sectionCss={styles.section(euiThemeContext)} />
    </EuiFlexGroup>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default PanelSettingsFlyoutSections;

const styles = {
  // the sections cancel the flyout body padding and add it back to their content
  sections: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginInline: `-${euiTheme.size.base}`,
      borderBottom: euiTheme.border.thin,
    }),
  // the first section starts at the top of the flyout body, below the header border
  firstInFlyoutBody: ({ euiTheme }: UseEuiTheme) =>
    css({
      marginBlockStart: `-${euiTheme.size.base}`,
      '& > :first-child': { borderBlockStart: 'none' },
    }),
  section: ({ euiTheme }: UseEuiTheme) => css({ paddingInline: euiTheme.size.base }),
};
