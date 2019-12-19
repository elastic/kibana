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

import { Section } from './section';
import { KibanaLegacySetup } from '../../kibana_legacy/public';
// @ts-ignore
import { LegacyManagementSection } from './legacy';
import { CreateSection } from './types';

export class ManagementService {
  private sections: Section[] = [];
  constructor() {
    this.sections = [];
  }

  // todo verify input,
  private register(
    registerLegacyApp: KibanaLegacySetup['registerLegacyApp'],
    getLegacyManagement: () => LegacyManagementSection
  ) {
    return (section: CreateSection) => {
      if (this.getSection(section.id)) {
        throw Error(`ManagementSection '${section.id}' already registered`);
      }

      const newSection = new Section(
        section,
        this.sections,
        registerLegacyApp,
        getLegacyManagement
      );
      this.sections.push(newSection);
      return newSection;
    };
  }
  private getSection(sectionId: Section['id']) {
    return this.sections.find(section => section.id === sectionId);
  }

  private getAllSections() {
    return this.sections;
  }

  public setup = (
    kibanaLegacy: KibanaLegacySetup,
    getLegacyManagement: () => LegacyManagementSection
  ) => {
    const register = this.register.bind(this)(kibanaLegacy.registerLegacyApp, getLegacyManagement);

    register({ id: 'kibana', title: 'Kibana', order: 30, euiIconType: 'logoKibana' });
    register({ id: 'logstash', title: 'Logstash', order: 30, euiIconType: 'logoLogstash' });
    register({
      id: 'elasticsearch',
      title: 'Elasticsearch',
      order: 20,
      euiIconType: 'logoElasticsearch',
    });

    return {
      register,
      getSection: this.getSection.bind(this),
      getAllSections: this.getAllSections.bind(this),
    };
  };

  public start = {
    getSection: this.getSection.bind(this),
    getAllSections: this.getAllSections.bind(this),
    navigateToApp: (appId: string, options?: { path?: string; state?: any }) => {
      // @ts-ignore
      // console.log('navigateToApp', appId, options);
    },
  };
}
