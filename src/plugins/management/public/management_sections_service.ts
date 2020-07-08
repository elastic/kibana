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
  SectionsServiceStart,
  SectionsServiceStartDeps,
  DefinedSections,
} from './types';

export class ManagementSectionsService {
  definedSections: DefinedSections;

  constructor() {
    this.definedSections = {
      ingest: this.registerSection({
        id: IngestSection.id,
        title: IngestSection.title,
        order: 0,
      }),
      data: this.registerSection({
        id: DataSection.id,
        title: DataSection.title,
        order: 1,
      }),
      insightsAndAlerting: this.registerSection({
        id: InsightsAndAlertingSection.id,
        title: InsightsAndAlertingSection.title,
        order: 2,
      }),
      security: this.registerSection({
        id: SecuritySection.id,
        title: SecuritySection.title,
        order: 3,
      }),
      kibana: this.registerSection({
        id: KibanaSection.id,
        title: KibanaSection.title,
        order: 4,
      }),
      stack: this.registerSection({
        id: StackSection.id,
        title: StackSection.title,
        order: 5,
      }),
    };
  }
  private sections: Map<ManagementSectionId | string, ManagementSection> = new Map();

  private getSection = (sectionId: ManagementSectionId | string) =>
    this.sections.get(sectionId) as ManagementSection;

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
      getSection: this.getSection,
      section: {
        ...this.definedSections,
      },
    };
  }

  start({ capabilities }: SectionsServiceStartDeps): SectionsServiceStart {
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

    return {
      getSection: this.getSection,
      getAllSections: this.getAllSections,
      getSectionsEnabled: () => this.getAllSections().filter((section) => section.enabled),
      section: {
        ...this.definedSections,
      },
    };
  }
}
