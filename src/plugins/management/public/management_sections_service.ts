/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { ManagementSection, RegisterManagementSectionArgs } from './utils';
import {
  IngestSection,
  DataSection,
  InsightsAndAlertingSection,
  SecuritySection,
  KibanaSection,
  StackSection,
} from './components/management_sections';

import {
  ManagementSectionId,
  SectionsServiceSetup,
  SectionsServiceStartDeps,
  DefinedSections,
  ManagementSectionsStartPrivate,
} from './types';
import { createGetterSetter } from '../../kibana_utils/public';

const [
  getSectionsServiceStartPrivate,
  setSectionsServiceStartPrivate,
] = createGetterSetter<ManagementSectionsStartPrivate>('SectionsServiceStartPrivate');

export { getSectionsServiceStartPrivate };

export class ManagementSectionsService {
  definedSections: DefinedSections;

  constructor() {
    // Note on adding sections - sections can be defined in a plugin and exported as a contract
    // It is not necessary to define all sections here, although we've chose to do it for discovery reasons.
    this.definedSections = {
      ingest: this.registerSection(IngestSection),
      data: this.registerSection(DataSection),
      insightsAndAlerting: this.registerSection(InsightsAndAlertingSection),
      security: this.registerSection(SecuritySection),
      kibana: this.registerSection(KibanaSection),
      stack: this.registerSection(StackSection),
    };
  }
  private sections: Map<ManagementSectionId | string, ManagementSection> = new Map();

  private getAllSections = () => [...this.sections.values()];

  private registerSection = (section: RegisterManagementSectionArgs) => {
    if (this.sections.has(section.id)) {
      throw Error(`ManagementSection '${section.id}' already registered`);
    }

    const newSection = new ManagementSection(section);

    this.sections.set(section.id, newSection);
    return newSection;
  };

  setup(): SectionsServiceSetup {
    return {
      register: this.registerSection,
      section: {
        ...this.definedSections,
      },
    };
  }

  start({ capabilities }: SectionsServiceStartDeps) {
    this.getAllSections().forEach((section) => {
      if (capabilities.management.hasOwnProperty(section.id)) {
        const sectionCapabilities = capabilities.management[section.id];
        section.apps.forEach((app) => {
          if (sectionCapabilities.hasOwnProperty(app.id) && sectionCapabilities[app.id] !== true) {
            app.disable();
          }
        });
      }
    });

    setSectionsServiceStartPrivate({
      getSectionsEnabled: () => this.getAllSections().filter((section) => section.enabled),
    });

    return {};
  }
}
