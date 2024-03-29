/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTitle, EuiSpacer } from '@elastic/eui';
import * as React from 'react';
import {
  DrilldownTemplateTable,
  DrilldownTemplateTableItem,
} from '../../components/drilldown_template_table';
import { DrilldownTemplate } from '../../types';
import { useDrilldownManager } from '../context';
import { txtLabel } from './i18n';

export interface TemplateListProps {
  items: DrilldownTemplate[];
}

export const TemplateList: React.FC<TemplateListProps> = ({ items }) => {
  const drilldowns = useDrilldownManager();
  const tableItems: DrilldownTemplateTableItem[] = React.useMemo<
    DrilldownTemplateTableItem[]
  >(() => {
    return items.map((item) => {
      const factory = drilldowns.deps.actionFactories.find(({ id }) => id === item.factoryId);
      const trigger = drilldowns.deps.getTrigger(item.triggers[0]);
      const tableItem: DrilldownTemplateTableItem = {
        id: item.id,
        name: item.name,
        icon: item.icon,
        description: item.description,
        triggerIncompatible: !drilldowns.deps.triggers.find((t) => t === trigger.id),
      };

      if (factory) {
        const context = drilldowns.getActionFactoryContext();
        tableItem.actionName = factory.getDisplayName(context);
        tableItem.actionIcon = factory.getIconType(context);
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
        onClone={drilldowns.onClone}
      />
    </>
  );
};
