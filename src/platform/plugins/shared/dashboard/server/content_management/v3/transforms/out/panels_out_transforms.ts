/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';

// TODO: This will be moved in https://github.com/elastic/kibana/issues/221295
import type { SavedDashboardPanel as DashboardPanelSavedObjectV1 } from '../../../../../common/content_management/v1/types';

import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
type DashboardPanelSavedObject = Omit<DashboardPanelSavedObjectV1, 'gridData'> & {
  gridData: {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    sectionId?: string;
  };
};

const sectionsSavedObjectSchema = schema.maybe(
  schema.arrayOf(
    schema.object({
      title: schema.string(),
      collapsed: schema.maybe(schema.boolean()),
      gridData: schema.object({ y: schema.number(), i: schema.string() }),
    })
  )
);

type SectionsSavedObject = TypeOf<typeof sectionsSavedObjectSchema>;
const isSectionsSavedObject = (sections: unknown): sections is SectionsSavedObject => {
  try {
    return Boolean(sectionsSavedObjectSchema.validate(sections));
  } catch {
    return false;
  }
};

// transforms panels from the unknown types stored in the saved object to the content management schema
export function transformPanelsOut(
  panelsJSON: unknown,
  sections: unknown
): { panels: DashboardAttributes['panels'] } {
  const panels = typeof panelsJSON === 'string' ? JSON.parse(panelsJSON) : [];
  const sectionsMap: { [uuid: string]: DashboardPanel | DashboardSection } = isSectionsSavedObject(
    sections
  )
    ? sections?.reduce((prev, section) => {
        const sectionId = section.gridData.i;
        return { ...prev, [sectionId]: { ...section, panels: [] } };
      }, {}) ?? {}
    : {};
  panels.forEach((panel: DashboardPanelSavedObject) => {
    const { sectionId } = panel.gridData;
    if (sectionId) {
      (sectionsMap[sectionId] as DashboardSection).panels.push(transformPanelProperties(panel));
    } else {
      sectionsMap[panel.panelIndex] = transformPanelProperties(panel);
    }
  });
  return { panels: Object.values(sectionsMap) };
}

function transformPanelProperties({
  embeddableConfig,
  gridData,
  id,
  panelIndex,
  panelRefName,
  title,
  type,
  version,
}: DashboardPanelSavedObject) {
  const { sectionId, ...rest } = gridData; // drop section ID, if it exists
  return {
    gridData: rest,
    id,
    panelConfig: embeddableConfig,
    panelIndex,
    panelRefName,
    title,
    type,
    version,
  };
}
