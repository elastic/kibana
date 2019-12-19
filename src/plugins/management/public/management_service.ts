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
import { Capabilities } from '../../../core/public';
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
      if (this.get(section.id)) {
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
  private get(sectionId: Section['id']) {
    return this.sections.find(section => section.id === sectionId);
  }

  private getAvailable(capabilities: Capabilities) {
    return () => {
      // console.log('CAPABILITIES', capabilities.management);
      // key and false
      // todo filter based on capabilities
      return [...this.sections];
      /*
      return this.sections.map(section => {
        const capManagmentSection = capabilities.management[section.id];
        if (capManagmentSection) {
          // would be nice to get a copy with apps filtered
          //section.apps.filter(app => capManagmentSection[app.id]);
        } else {
          return section;
        }
      });
      */
    };
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
      get: this.get.bind(this),
      getAvailable: this.getAvailable.bind(this),
    };
  };

  public start = (capabilities: Capabilities) => ({
    getAvailable: this.getAvailable.bind(this)(capabilities),

    navigateToApp: (appId: string, options?: { path?: string; state?: any }) => {
      // @ts-ignore
      // console.log('navigateToApp', appId, options);
    },
  });
}
