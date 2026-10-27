/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiCode,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { SidebarBody, SidebarHeader } from '@kbn/core-chrome-sidebar-components';
import {
  PAGE_ENTER_DURATION,
  SPINNER_DURATION,
  resolveMotionTokens,
  setMotionRefreshEnabled,
  setMotionRefreshItem,
  useMotionRefreshSettings,
  type MotionRefreshId,
} from '@kbn/react-kibana-context-root';

/** Sidebar app id for the motion refresh prototype. */
export const MOTION_REFRESH_SIDEBAR_APP_ID = 'sidebarExampleMotionRefresh' as const;

const panelTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshTitle', {
  defaultMessage: 'Motion refresh',
});


const allMotionsLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshAllMotionsToggleSwitch',
  {
    defaultMessage: 'All motions',
  }
);

const allMotionsDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshAllMotionsDescription',
  {
    defaultMessage:
      'On when every update is enabled. Turn it off to disable them all, or on to enable them all.',
  }
);

const tokenColumnLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshTokenColumnLabel',
  {
    defaultMessage: 'Token',
  }
);

const valueColumnLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshValueColumnLabel',
  {
    defaultMessage: 'Value',
  }
);

const easingUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshEasingUseLabel',
  {
    defaultMessage: 'Easing',
  }
);

const tooltipTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshTooltipTitle', {
  defaultMessage: 'Tooltip',
});

const tooltipDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshTooltipDescription',
  {
    defaultMessage:
      'Tooltips wait, then rise and settle the way popovers do. The fade uses bounce, and the drift lasts 100ms longer than the fade. They also scale up from 92%.',
  }
);

const tooltipSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshTooltipToggleSwitch',
  {
    defaultMessage: 'Enable tooltip motion',
  }
);

const tabsTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshTabsTitle', {
  defaultMessage: 'Tabs',
});

const tabsDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshTabsDescription',
  {
    defaultMessage:
      'The underline slides from one selected tab to the next, and the label color fades with it.',
  }
);

const tabsSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshTabsToggleSwitch',
  {
    defaultMessage: 'Enable tab motion',
  }
);

const accordionTitle = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshAccordionTitle',
  {
    defaultMessage: 'Accordion',
  }
);

const accordionDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshAccordionDescription',
  {
    defaultMessage:
      'A triangle turns as the panel opens. The content slides down with the height change. The button itself stays still.',
  }
);

const accordionSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshAccordionToggleSwitch',
  {
    defaultMessage: 'Enable accordion motion',
  }
);

const delayUseLabel = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshDelayUseLabel', {
  defaultMessage: 'Delay',
});

const fadeUseLabel = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshFadeUseLabel', {
  defaultMessage: 'Fade',
});

const driftDurationUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshDriftDurationUseLabel',
  {
    defaultMessage: 'Drift and scale',
  }
);

const driftDistanceUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshDriftDistanceUseLabel',
  {
    defaultMessage: 'Drift distance',
  }
);

const slideUseLabel = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshSlideUseLabel', {
  defaultMessage: 'Slide and color',
});

const indicatorUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshIndicatorUseLabel',
  {
    defaultMessage: 'Indicator',
  }
);

const disabledIndicatorUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshDisabledIndicatorUseLabel',
  {
    defaultMessage: 'Disabled indicator',
  }
);

const thicknessUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshThicknessUseLabel',
  {
    defaultMessage: 'Thickness',
  }
);

const rotationUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshRotationUseLabel',
  {
    defaultMessage: 'Rotation and slide',
  }
);

const contentOffsetUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshContentOffsetUseLabel',
  {
    defaultMessage: 'Content offset',
  }
);

const calloutTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshCalloutTitle', {
  defaultMessage: 'Callout',
});

const calloutDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshCalloutDescription',
  {
    defaultMessage:
      'Callouts and banners appear with the rest of the page. Dismissing one fades it and collapses its height, so the page does not jump.',
  }
);

const calloutSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshCalloutToggleSwitch',
  {
    defaultMessage: 'Enable callout motion',
  }
);

const calloutHeightUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshCalloutHeightUseLabel',
  {
    defaultMessage: 'Dismiss',
  }
);

const pageTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshPageTitle', {
  defaultMessage: 'Page',
});

const pageDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshPageDescription',
  {
    defaultMessage:
      'Switching to another app fades the new page in and lifts its content a short distance. The header and navigation stay in place. Moving within an app stays instant.',
  }
);

const pageSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshPageToggleSwitch',
  {
    defaultMessage: 'Enable page motion',
  }
);

const pageRiseUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshPageRiseUseLabel',
  {
    defaultMessage: 'Rise',
  }
);

const spinnerTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshSpinnerTitle', {
  defaultMessage: 'Spinner',
});

const spinnerDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshSpinnerDescription',
  {
    defaultMessage:
      'Every loading spinner fades from the primary color into teal around the ring. The primary color covers a quarter more of the ring, and the spin is a quarter slower.',
  }
);

const spinnerSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshSpinnerToggleSwitch',
  {
    defaultMessage: 'Enable spinner',
  }
);

const spinnerSpinUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshSpinnerSpinUseLabel',
  {
    defaultMessage: 'Spin',
  }
);

const spinnerPrimaryUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshSpinnerPrimaryUseLabel',
  {
    defaultMessage: 'Primary',
  }
);

const spinnerTealUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshSpinnerTealUseLabel',
  {
    defaultMessage: 'Teal',
  }
);

const shimmerTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshShimmerTitle', {
  defaultMessage: 'Shimmer text loader',
});

const shimmerSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshShimmerToggleSwitch',
  {
    defaultMessage: 'Enable shimmer text loader',
  }
);

const dotsTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshDotsTitle', {
  defaultMessage: 'Dot Loader',
});

const dotsSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshDotsToggleSwitch',
  {
    defaultMessage: 'Enable dot loader',
  }
);

const loginTitle = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshLoginTitle', {
  defaultMessage: 'Log in screen',
});

const loginDescription = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshLoginDescription',
  {
    defaultMessage:
      'The boot screen and the log in page share the dotted corner pattern. The boot screen also shows the Elastic wordmark and a primary line that fades into the teal track.',
  }
);

const loginSwitchLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshLoginToggleSwitch',
  {
    defaultMessage: 'Enable log in screen',
  }
);

const loginTrackUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshLoginTrackUseLabel',
  {
    defaultMessage: 'Track',
  }
);

const loginLineUseLabel = i18n.translate(
  'core.ui.chrome.headerGlobalNav.motionRefreshLoginLineUseLabel',
  {
    defaultMessage: 'Line',
  }
);

interface TokenRow {
  id: string;
  token: string;
  value: string;
  use: string;
}

const tokenValueStyles = css`
  word-break: break-word;
`;

const columns: Array<EuiBasicTableColumn<TokenRow>> = [
  {
    field: 'token',
    name: tokenColumnLabel,
    render: (token: TokenRow['token'], row: TokenRow) => (
      <>
        <EuiCode>{token}</EuiCode>
        <EuiText size="xs" color="subdued">
          <p>{row.use}</p>
        </EuiText>
      </>
    ),
    valign: 'top',
  },
  {
    field: 'value',
    name: valueColumnLabel,
    render: (value: TokenRow['value']) => <EuiCode css={tokenValueStyles}>{value}</EuiCode>,
    valign: 'top',
  },
];

const MotionSection = ({
  id,
  title,
  description,
  switchLabel,
  checked,
  rows,
  caption,
}: {
  id: MotionRefreshId;
  title: string;
  description: string;
  switchLabel: string;
  checked: boolean;
  rows: TokenRow[];
  caption: string;
}) => (
  <EuiAccordion
    id={`motionRefresh-${id}`}
    buttonContent={title}
    borders="horizontal"
    paddingSize="s"
    extraAction={
      <EuiSwitch
        label={switchLabel}
        showLabel={false}
        checked={checked}
        compressed
        onChange={(event) => setMotionRefreshItem(id, event.target.checked)}
        data-test-subj={`motionRefresh-${id}-switch`}
      />
    }
    data-test-subj={`motionRefresh-${id}`}
  >
    <EuiText size="s">
      <p>{description}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiBasicTable
      items={rows}
      columns={columns}
      tableCaption={caption}
      compressed
      tableLayout="auto"
      data-test-subj={`motionRefresh-${id}-tokens`}
    />
  </EuiAccordion>
);

export interface MotionRefreshSidebarProps {
  onClose: () => void;
}

/** Side panel for comparing the motion refresh updates. */
export const MotionRefreshSidebar = ({ onClose }: MotionRefreshSidebarProps) => {
  const { euiTheme, highContrastMode } = useEuiTheme();
  const settings = useMotionRefreshSettings();
  const tokens = resolveMotionTokens(euiTheme, Boolean(highContrastMode));
  const allOn =
    settings.tooltip &&
    settings.tabs &&
    settings.accordion &&
    settings.callout &&
    settings.page &&
    settings.spinner &&
    settings.shimmer &&
    settings.dots &&
    settings.login;

  const tooltipRows: TokenRow[] = [
    { id: 'delay', token: 'animation.extraFast', value: tokens.tooltipDelay, use: delayUseLabel },
    { id: 'fade', token: 'animation.slow', value: tokens.opacityDuration, use: fadeUseLabel },
    {
      id: 'drift-duration',
      token: 'animation.slow + 100ms',
      value: tokens.transformDuration,
      use: driftDurationUseLabel,
    },
    { id: 'easing', token: 'animation.bounce', value: tokens.popoverEasing, use: easingUseLabel },
    { id: 'drift', token: 'size.s', value: tokens.drift, use: driftDistanceUseLabel },
  ];

  const tabRows: TokenRow[] = [
    { id: 'duration', token: 'animation.slow', value: tokens.tabDuration, use: slideUseLabel },
    { id: 'easing', token: 'animation.resistance', value: tokens.tabEasing, use: easingUseLabel },
    { id: 'color', token: 'colors.primary', value: tokens.indicatorColor, use: indicatorUseLabel },
    {
      id: 'disabled',
      token: 'colors.textDisabled',
      value: tokens.indicatorDisabledColor,
      use: disabledIndicatorUseLabel,
    },
    {
      id: 'thickness',
      token: 'border.width.thick',
      value: tokens.indicatorThickness,
      use: thicknessUseLabel,
    },
  ];

  const accordionRows: TokenRow[] = [
    {
      id: 'duration',
      token: 'animation.normal',
      value: tokens.accordionDuration,
      use: rotationUseLabel,
    },
    {
      id: 'easing',
      token: 'animation.resistance',
      value: tokens.accordionEasing,
      use: easingUseLabel,
    },
    { id: 'offset', token: 'size.s', value: tokens.drift, use: contentOffsetUseLabel },
  ];

  const calloutRows: TokenRow[] = [
    {
      id: 'duration',
      token: 'animation.normal',
      value: tokens.calloutDuration,
      use: calloutHeightUseLabel,
    },
    {
      id: 'easing',
      token: 'animation.resistance',
      value: tokens.calloutEasing,
      use: easingUseLabel,
    },
  ];

  const pageRows: TokenRow[] = [
    { id: 'duration', token: PAGE_ENTER_DURATION, value: PAGE_ENTER_DURATION, use: fadeUseLabel },
    { id: 'easing', token: 'animation.resistance', value: tokens.pageEasing, use: easingUseLabel },
    { id: 'rise', token: '2px', value: tokens.pageRise, use: pageRiseUseLabel },
  ];

  const spinnerRows: TokenRow[] = [
    {
      id: 'duration',
      token: SPINNER_DURATION,
      value: SPINNER_DURATION,
      use: spinnerSpinUseLabel,
    },
    {
      id: 'primary',
      token: 'colors.borderStrongPrimary',
      value: tokens.spinnerPrimary,
      use: spinnerPrimaryUseLabel,
    },
    {
      id: 'teal',
      token: 'colors.borderStrongAccentSecondary',
      value: tokens.spinnerTeal,
      use: spinnerTealUseLabel,
    },
  ];

  const loginRows: TokenRow[] = [
    { id: 'track', token: '#48EFCF', value: '#48EFCF', use: loginTrackUseLabel },
    { id: 'line', token: '#0B64DD', value: '#0B64DD', use: loginLineUseLabel },
  ];

  return (
    <>
      <SidebarHeader title={panelTitle} onClose={onClose} />
      <SidebarBody scrollable>
        <div data-test-subj="motionRefreshSidebar">          
          <EuiSpacer size="m" />
          <EuiSwitch
            label={allMotionsLabel}
            checked={allOn}
            onChange={() => setMotionRefreshEnabled(!allOn)}
            data-test-subj="motionRefresh-all-switch"
          />
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>{allMotionsDescription}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <MotionSection
            id="tooltip"
            title={tooltipTitle}
            description={tooltipDescription}
            switchLabel={tooltipSwitchLabel}
            checked={settings.tooltip}
            rows={tooltipRows}
            caption={tooltipTitle}
          />
          <MotionSection
            id="tabs"
            title={tabsTitle}
            description={tabsDescription}
            switchLabel={tabsSwitchLabel}
            checked={settings.tabs}
            rows={tabRows}
            caption={tabsTitle}
          />
          <MotionSection
            id="accordion"
            title={accordionTitle}
            description={accordionDescription}
            switchLabel={accordionSwitchLabel}
            checked={settings.accordion}
            rows={accordionRows}
            caption={accordionTitle}
          />
          <MotionSection
            id="callout"
            title={calloutTitle}
            description={calloutDescription}
            switchLabel={calloutSwitchLabel}
            checked={settings.callout}
            rows={calloutRows}
            caption={calloutTitle}
          />
          <MotionSection
            id="page"
            title={pageTitle}
            description={pageDescription}
            switchLabel={pageSwitchLabel}
            checked={settings.page}
            rows={pageRows}
            caption={pageTitle}
          />
          <MotionSection
            id="spinner"
            title={spinnerTitle}
            description={spinnerDescription}
            switchLabel={spinnerSwitchLabel}
            checked={settings.spinner}
            rows={spinnerRows}
            caption={spinnerTitle}
          />
          <MotionSection
            id="shimmer"
            title={shimmerTitle}
            description=""
            switchLabel={shimmerSwitchLabel}
            checked={settings.shimmer}
            rows={[]}
            caption={shimmerTitle}
          />
          <MotionSection
            id="dots"
            title={dotsTitle}
            description=""
            switchLabel={dotsSwitchLabel}
            checked={settings.dots}
            rows={[]}
            caption={dotsTitle}
          />
          <MotionSection
            id="login"
            title={loginTitle}
            description={loginDescription}
            switchLabel={loginSwitchLabel}
            checked={settings.login}
            rows={loginRows}
            caption={loginTitle}
          />
        </div>
      </SidebarBody>
      <div
        aria-hidden={true}
        css={css`
          flex-shrink: 0;
          display: flex;
          justify-content: flex-start;
          align-items: flex-end;
          line-height: 0;
          pointer-events: none;
        `}
      >
        <img
          src={catLoveSrc()}
          alt=""
          width={138}
          height={138}
          css={css`
            display: block;
            width: 164px;
            height: 164px;
          `}
        />
      </div>
    </>
  );
};

const catLoveSrc = (): string => {
  const link = document.querySelector('link[rel="stylesheet"][href*="legacy_styles.css"]');
  const href = link?.getAttribute('href') ?? '';
  const base = href.replace(/legacy_styles\.css(?:\?.*)?$/, '');
  return `${base}login_screen/cat_love.gif`;
};
