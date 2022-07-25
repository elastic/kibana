/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createGetterSetter } from '@kbn/kibana-utils-plugin/public';
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

const [getSectionsServiceStartPrivate, setSectionsServiceStartPrivate] =
  createGetterSetter<ManagementSectionsStartPrivate>('SectionsServiceStartPrivate');

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
          const capabilitiesId = app.capabilitiesId || app.id;
          if (
            sectionCapabilities.hasOwnProperty(capabilitiesId) &&
            sectionCapabilities[capabilitiesId] !== true
          ) {
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
