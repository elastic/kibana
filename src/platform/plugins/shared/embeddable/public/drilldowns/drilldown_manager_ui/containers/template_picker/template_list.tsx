/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import type { DrilldownTemplateTableItem } from '../../components/drilldown_template_table';
import { DrilldownTemplateTable } from '../../components/drilldown_template_table';
import type { DrilldownTemplate } from '../../types';
import { useDrilldownsManager } from '../context';
import { txtLabel } from './i18n';

export interface TemplateListProps {
  items: DrilldownTemplate[];
}

export const TemplateList: React.FC<TemplateListProps> = ({ items }) => {
  const drilldowns = useDrilldownsManager();
  const tableItems: DrilldownTemplateTableItem[] = React.useMemo<
    DrilldownTemplateTableItem[]
  >(() => {
    return items.map((item) => {
      const factory = drilldowns.deps.factories.find(
        ({ type }) => type === item.drilldownState.type
      );
      const trigger = drilldowns.deps.getTrigger(item.drilldownState.trigger);
      const tableItem: DrilldownTemplateTableItem = {
        id: item.id,
        name: item.drilldownState.label,
        description: item.description,
        triggerIncompatible: !drilldowns.deps.triggers.find((t) => t === trigger.id),
      };

      if (factory) {
        tableItem.actionName = factory.displayName;
        tableItem.actionIcon = factory.euiIcon;
      }
      if (trigger) {
        tableItem.trigger = trigger.title;
      }
      return tableItem;
    });
  }, [drilldowns, items]);

  return (
    <>
      <EuiTitle size="xs">
        <h4>{txtLabel}</h4>
      </EuiTitle>
      <EuiSpacer size={'s'} />
      <DrilldownTemplateTable
        items={tableItems}
        onCreate={drilldowns.onCreateFromTemplate}
        onClone={drilldowns.onCloneTemplates}
      />
    </>
  );
};
