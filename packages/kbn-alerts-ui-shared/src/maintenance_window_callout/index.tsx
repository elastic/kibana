/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut } from '@elastic/eui';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { MaintenanceWindowStatus, KibanaServices } from './types';
import { useFetchActiveMaintenanceWindows } from './use_fetch_active_maintenance_windows';

const MAINTENANCE_WINDOW_FEATURE_ID = 'maintenanceWindow';
const MAINTENANCE_WINDOW_RUNNING_DESCRIPTION = i18n.translate(
  'alertsUIShared.maintenanceWindowCallout.maintenanceWindowActiveDescription',
  {
    defaultMessage: 'Rule notifications are stopped while maintenance windows are running.',
  }
);
const MAINTENANCE_WINDOW_NO_CATEGORY_TITLE = i18n.translate(
  'alertsUIShared.maintenanceWindowCallout.maintenanceWindowActiveNoCategories',
  {
    defaultMessage: 'One or more maintenance windows are running',
  }
);

const maintenanceWindowTwoCategoryNames = (names: string[]) =>
  i18n.translate('alertsUIShared.maintenanceWindowCallout.maintenanceWindowTwoCategoryNames', {
    defaultMessage: '{first} and {second}',
    values: { first: names[0], second: names[1] },
  });
const maintenanceWindowMultipleCategoryNames = (names: string[]) =>
  i18n.translate('alertsUIShared.maintenanceWindowCallout.maintenanceWindowMultipleCategoryNames', {
    defaultMessage: '{commaSeparatedList}, and {last}', // Oxford comma, e.g. "First, second, and third"
    values: { commaSeparatedList: names.slice(0, -1).join(', '), last: names.slice(-1).join('') },
  });

const APP_CATEGORIES = {
  ...DEFAULT_APP_CATEGORIES,
  management: {
    ...DEFAULT_APP_CATEGORIES.management,
    label: i18n.translate('alertsUIShared.maintenanceWindowCallout.managementCategoryLabel', {
      defaultMessage: 'Stack',
    }),
  },
};

export function MaintenanceWindowCallout({
  kibanaServices,
  categories,
}: {
  kibanaServices: KibanaServices;
  categories?: string[];
}): JSX.Element | null {
  const {
    application: { capabilities },
  } = kibanaServices;

  const isMaintenanceWindowDisabled =
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].show &&
    !capabilities[MAINTENANCE_WINDOW_FEATURE_ID].save;
  const { data: activeMaintenanceWindows = [] } = useFetchActiveMaintenanceWindows(kibanaServices, {
    enabled: !isMaintenanceWindowDisabled,
  });

  const shouldShowMaintenanceWindowCallout = useMemo(() => {
    if (!activeMaintenanceWindows) {
      return false;
    }
    if (activeMaintenanceWindows.length === 0) {
      return false;
    }

    // If categories is omitted, always display the callout
    if (!Array.isArray(categories)) {
      return true;
    }

    return activeMaintenanceWindows.some(({ status, categoryIds }) => {
      if (status !== MaintenanceWindowStatus.Running) {
        return false;
      }
      if (!Array.isArray(categoryIds)) {
        return true;
      }
      return categoryIds.some((category) => categories.includes(category));
    });
  }, [categories, activeMaintenanceWindows]);

  const categoryNames = useMemo(() => {
    const activeCategoryIds = Array.from(
      new Set(
        activeMaintenanceWindows
          .map(({ categoryIds }) =>
            // If the categories array is provided, only display category names that are included in it
            categoryIds?.filter((categoryId) => !categories || categories.includes(categoryId))
          )
          .flat()
      )
    );
    const activeCategories = activeCategoryIds
      .map(
        (categoryId) =>
          Object.values(APP_CATEGORIES).find((c) => c.id === categoryId)?.label ?? categoryId
      )
      .filter(Boolean) as string[];
    return activeCategories.length === 0
      ? null
      : activeCategories.length === 1
      ? `${activeCategories}`
      : activeCategories.length === 2
      ? maintenanceWindowTwoCategoryNames(activeCategories)
      : maintenanceWindowMultipleCategoryNames(activeCategories);
  }, [activeMaintenanceWindows, categories]);

  if (isMaintenanceWindowDisabled) {
    return null;
  }

  if (!shouldShowMaintenanceWindowCallout) {
    return null;
  }

  return (
    <EuiCallOut
      title={
        !categoryNames
          ? MAINTENANCE_WINDOW_NO_CATEGORY_TITLE
          : i18n.translate('alertsUIShared.maintenanceWindowCallout.maintenanceWindowActive', {
              defaultMessage:
                '{activeWindowCount, plural, one {A maintenance window is} other {Maintenance windows are}} running for {categories} rules',
              values: {
                categories: categoryNames,
                activeWindowCount: activeMaintenanceWindows.length,
              },
            })
      }
      color="warning"
      iconType="iInCircle"
      data-test-subj="maintenanceWindowCallout"
    >
      {MAINTENANCE_WINDOW_RUNNING_DESCRIPTION}
    </EuiCallOut>
  );
}
