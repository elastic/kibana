/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiIcon, EuiText, EuiTourStep } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { useInternalStateSelector, selectIsTabsBarHidden } from '../../state_management/redux';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY } from '../../../../../common/constants';

export const useSwitchModesTour = (): React.ReactNode => {
  const services = useDiscoverServices();
  const currentTabId = useInternalStateSelector((state) => state.tabs.unsafeCurrentId);
  const hideTabsBar = useInternalStateSelector(selectIsTabsBarHidden);

  const [isDismissed, setIsDismissed] = useState(() =>
    Boolean(services.storage.get(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY))
  );
  const [isOpen, setIsOpen] = useState(false);

  const onClose = useCallback(() => {
    services.storage.set(DISCOVER_TAB_MENU_SWITCH_MODES_CALLOUT_KEY, true);
    setIsDismissed(true);
  }, [services.storage]);

  const areToursEnabled = services.notifications?.tours?.isEnabled() ?? true;
  const shouldShow =
    areToursEnabled &&
    services.uiSettings.get(ENABLE_ESQL) &&
    !isDismissed &&
    !hideTabsBar &&
    !!currentTabId;

  useEffect(() => {
    if (!shouldShow) {
      setIsOpen(false);
      return;
    }
    let cancelled = false;
    let raf2: number;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) setIsOpen(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
    };
  }, [shouldShow]);

  if (!shouldShow || !currentTabId) {
    return null;
  }

  return (
    <EuiTourStep
      anchor={`[data-test-subj="unifiedTabs_tabMenuBtn_${currentTabId}"]`}
      anchorPosition="leftUp"
      step={1}
      stepsTotal={1}
      isStepOpen={isOpen}
      onFinish={onClose}
      closePopover={() => {}}
      ownFocus
      initialFocus="[data-test-subj='discoverTabMenuSwitchModesTourClose']"
      title={i18n.translate('discover.tabsView.switchModesCalloutTitle', {
        defaultMessage: 'Switch modes per tab',
      })}
      content={
        <EuiText size="s">
          <p>
            {i18n.translate('discover.tabsView.switchModesCalloutDescription', {
              defaultMessage:
                'Use the tab menu {icon} on each tab to switch between Classic and ES|QL.',
              values: {
                icon: (
                  <EuiIcon
                    type="boxesVertical"
                    size="s"
                    style={{ verticalAlign: 'middle', marginLeft: 2, marginRight: 2 }}
                    aria-hidden
                  />
                ),
              },
            })}
          </p>
        </EuiText>
      }
      footerAction={
        <EuiButtonEmpty
          size="xs"
          flush="right"
          color="text"
          data-test-subj="discoverTabMenuSwitchModesTourClose"
          onClick={onClose}
        >
          {i18n.translate('discover.tabsView.switchModesTourClose', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      }
      data-test-subj="discoverTabMenuSwitchModesCallout"
    />
  );
};
