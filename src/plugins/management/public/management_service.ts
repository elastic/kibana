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

import { ManagementSection } from './management_section';
import { managementSections } from './management_sections';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { LegacyManagementSection, sections } from './legacy';
import { CreateSection, ManagementSectionId } from './types';
import { StartServicesAccessor, CoreStart } from '../../../core/public';

export class ManagementService {
  private sections: ManagementSection[] = [];

  private register(
    registerLegacyApp: KibanaLegacySetup['registerLegacyApp'],
    getLegacyManagement: () => LegacyManagementSection,
    getStartServices: StartServicesAccessor
  ) {
    return (section: CreateSection) => {
      if (this.getSection(section.id)) {
        throw Error(`ManagementSection '${section.id}' already registered`);
      }

      const newSection = new ManagementSection(
        section,
        this.getSectionsEnabled.bind(this),
        registerLegacyApp,
        getLegacyManagement,
        getStartServices
      );
      this.sections.push(newSection);
      return newSection;
    };
  }

  private getSection(sectionId: ManagementSectionId) {
    return this.sections.find(section => section.id === sectionId);
  }

  private getAllSections() {
    return this.sections;
  }

  private getSectionsEnabled() {
    return this.sections
      .filter(section => section.getAppsEnabled().length > 0)
      .sort((a, b) => a.order - b.order);
  }

  private sharedInterface = {
    getSection: (sectionId: ManagementSectionId) => {
      const section = this.getSection(sectionId);
      if (!section) {
        throw new Error(`Management section with id ${sectionId} is undefined`);
      }
      return section;
    },
    getSectionsEnabled: this.getSectionsEnabled.bind(this),
    getAllSections: this.getAllSections.bind(this),
  };

  public setup(
    kibanaLegacy: KibanaLegacySetup,
    getLegacyManagement: () => LegacyManagementSection,
    getStartServices: StartServicesAccessor
  ) {
    const register = this.register.bind(this)(
      kibanaLegacy.registerLegacyApp,
      getLegacyManagement,
      getStartServices
    );

    managementSections.forEach(
      ({ id, title }: { id: ManagementSectionId; title: ReactElement }, idx: number) => {
        register({ id, title, order: idx });
      }
    );

    return {
      ...this.sharedInterface,
    };
  }

  public start(navigateToApp: CoreStart['application']['navigateToApp']) {
    return {
      navigateToApp, // apps are currently registered as top level apps but this may change in the future
      ...this.sharedInterface,
    };
  }
}
