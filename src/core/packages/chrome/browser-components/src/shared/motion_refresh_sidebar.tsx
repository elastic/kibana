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

const panelDescription = i18n.translate('core.ui.chrome.headerGlobalNav.motionRefreshDescription', {
  defaultMessage:
    'These updates are on across Kibana. Turn one off to compare it with the current motion, or turn them all off together.',
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
    paddingSize="m"
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
    settings.tooltip && settings.tabs && settings.accordion && settings.callout && settings.page;

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

  return (
    <>
      <SidebarHeader title={panelTitle} onClose={onClose} />
      <SidebarBody scrollable>
        <div data-test-subj="motionRefreshSidebar">
          <EuiText size="s">
            <p>{panelDescription}</p>
          </EuiText>
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
        </div>
      </SidebarBody>
    </>
  );
};
