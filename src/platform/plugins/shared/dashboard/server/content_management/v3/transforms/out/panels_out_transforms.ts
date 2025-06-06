/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TypeOf, schema } from '@kbn/config-schema';
import { Serializable } from '@kbn/utility-types';
import { DashboardAttributes, DashboardPanel, DashboardSection } from '../../types';

/**
 * A saved dashboard panel parsed directly from the Dashboard Attributes panels JSON
 */
interface DashboardPanelSavedObject {
  embeddableConfig: { [key: string]: Serializable }; // parsed into the panel's explicitInput
  id?: string; // the saved object id for by reference panels
  type: string; // the embeddable type
  panelRefName?: string;
  gridData: {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    sectionId?: string;
  };
  panelIndex: string;
  title?: string;

  /**
   * This version key was used to store Kibana version information from versions 7.3.0 -> 8.11.0.
   * As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the
   * embeddable's input. (embeddableConfig in this type).
   */
  version?: string;
}

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
): DashboardAttributes['panels'] {
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
  return Object.values(sectionsMap);
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
