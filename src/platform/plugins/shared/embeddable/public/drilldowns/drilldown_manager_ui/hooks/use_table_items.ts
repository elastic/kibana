/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import type { DrilldownActionState } from '../../types';
import { insufficientLicenseLevel, invalidDrilldownType } from '../state/i18n';
import type { DrilldownsManagerDeps } from '../state';

export const useTableItems = (
  drilldowns$: PublishingSubject<DrilldownActionState[]>,
  factories: DrilldownsManagerDeps['factories'],
  getTrigger: DrilldownsManagerDeps['getTrigger'],
  triggers: DrilldownsManagerDeps['triggers']
) => {
  const drilldowns = useStateFromPublishingSubject(drilldowns$);

  const items = useMemo(() => {
    return drilldowns.map((drilldownState) => {
      const factory = factories.find(({ type }) => type === drilldownState.type);
      return {
        id: drilldownState.actionId,
        drilldownName: drilldownState.label,
        actionName: factory?.displayName ?? drilldownState.type,
        icon: factory?.euiIcon,
        error: !factory
          ? invalidDrilldownType(drilldownState.type) // this shouldn't happen for the end user, but useful during development
          : !factory.isLicenseCompatible
          ? insufficientLicenseLevel
          : undefined,
        trigger: getTrigger(drilldownState.trigger),
        triggerIncompatible: !triggers.find((t) => t === drilldownState.trigger),
      };
    });
  }, [drilldowns, factories, getTrigger, triggers]);

  return items;
};
