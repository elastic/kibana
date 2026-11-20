/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UseEuiTheme } from '@elastic/eui';
import { EuiImage, EuiPageTemplate, EuiText, euiBreakpoint, euiMinBreakpoint } from '@elastic/eui';
import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { coreServices } from '../../../services/kibana_services';

export function AwaitingFiltersScreen() {
  const isDarkTheme = useKibanaIsDarkMode();
  const styles = useMemoCss(emptyScreenStyles);

  // TODO replace these SVGs with versions from EuiIllustration as soon as it becomes available.
  const imageUrl = coreServices.http.basePath.prepend(
    `/plugins/dashboard/assets/${isDarkTheme ? 'required_filters_dark' : 'required_filters'}.svg`
  );

  const title = (() => {
    const titleString = i18n.translate('dashboard.emptyScreen.awaitingRequiredControlsTitle', {
      defaultMessage: 'Waiting for required controls.',
    });
    return <h2>{titleString}</h2>;
  })();

  const body = (
    <EuiText size="s" color="subdued">
      <span>
        {i18n.translate('dashboard.emptyScreen.awaitingRequiredControlsSubtitle', {
          defaultMessage: 'Make a selection in each required control to show the dashboard panels.',
        })}
      </span>
    </EuiText>
  );

  return (
    <div css={emptyScreenStyles.parent}>
      <EuiPageTemplate
        grow={false}
        data-test-subj="dashboardAwaitingRequiredFilters"
        css={styles.template}
      >
        <EuiPageTemplate.EmptyPrompt
          icon={<EuiImage size="fullWidth" src={imageUrl} alt="" />}
          title={title}
          body={body}
          titleSize="xs"
          color="transparent"
          css={styles.widgetContainer}
        />
      </EuiPageTemplate>
    </div>
  );
}

const emptyScreenStyles = {
  parent: css({
    display: 'flex',
    flexGrow: 1,
    height: '100%',
    minWidth: 0,
    width: '100%',
  }),
  template: css({
    backgroundColor: 'inherit',
    paddingBlockStart: '0 !important',
    width: '100%',
    minWidth: 0,
  }),
  widgetContainer: (euiThemeContext: UseEuiTheme) => {
    const { euiTheme } = euiThemeContext;
    return css({
      width: '100%',
      // Wide enough for "Create visualization (query)" to stay on one line
      // beside its icon when the two featured cards sit side-by-side on laptop.
      maxWidth: '52rem',
      minWidth: 0,
      boxSizing: 'border-box',
      padding: euiTheme.size.xl,
      paddingTop: '0 !important',
      borderRadius: euiTheme.border.radius.medium,
      [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
        maxWidth: '100%',
        padding: euiTheme.size.base,
        paddingTop: '0 !important',
      },
      [euiMinBreakpoint(euiThemeContext, 'm')]: {
        width: '48rem',
      },
      '.euiEmptyPrompt__icon': {
        marginBottom: euiTheme.size.l,
        paddingRight: euiTheme.size.s,
        maxWidth: '100%',
        [euiBreakpoint(euiThemeContext, ['xs', 's'])]: {
          marginBottom: euiTheme.size.m,
          paddingRight: 0,
        },
      },
      '.euiEmptyPrompt__content, .euiEmptyPrompt__actions': {
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
      },
    });
  },
};
