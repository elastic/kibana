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

import { ReactElement } from 'react';
import { ManagementSection, RegisterManagementSectionArgs } from './utils';
import { managementSections } from './components/management_sections';

import {
  ManagementSectionId,
  SectionsServiceSetup,
  SectionsServiceStart,
  SectionsServiceStartDeps,
} from './types';

export class ManagementSectionsService {
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
    managementSections.forEach(
      ({ id, title }: { id: ManagementSectionId; title: ReactElement }, idx: number) => {
        this.registerSection({ id, title, order: idx });
      }
    );

    return {
      register: this.registerSection,
      getSection: this.getSection,
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
    };
  }
}
