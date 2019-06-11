/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get } from 'lodash';
import { migrateIndexPattern700 } from './migrate_index_pattern';
import { DashboardDoc700, DashboardDocPre700 } from './types';

export function dashboardMigrations700(doc: DashboardDocPre700): DashboardDoc700 {
  const doc700: DashboardDoc700 = {
    ...doc,
    references: [],
  };

  // Migrate index pattern
  migrateIndexPattern700(doc700);

  // Migrate panels
  const panelsJSON = get(doc, 'attributes.panelsJSON');
  if (typeof panelsJSON !== 'string') {
    return doc as DashboardDoc700;
  }

  let panels;
  try {
    panels = JSON.parse(panelsJSON);
  } catch (e) {
    // Let it go, the data is invalid and we'll leave it as is
    return doc as DashboardDoc700;
  }
  if (!Array.isArray(panels)) {
    return doc as DashboardDoc700;
  }
  panels.forEach((panel, i) => {
    if (!panel.type || !panel.id) {
      return;
    }
    panel.panelRefName = `panel_${i}`;
    doc700.references.push({
      name: `panel_${i}`,
      type: panel.type,
      id: panel.id,
    });
    delete panel.type;
    delete panel.id;
  });

  doc700.attributes.panelsJSON = JSON.stringify(panels);
  return doc700;
}
