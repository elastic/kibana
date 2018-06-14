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

import { INSTRUCTION_VARIANT } from '../../../common/tutorials/instruction_variant';
import { FILEBEAT_INSTRUCTIONS } from '../../../common/tutorials/filebeat_instructions';
import { FILEBEAT_CLOUD_INSTRUCTIONS } from '../../../common/tutorials/filebeat_cloud_instructions';
import { ENABLE_INSTRUCTIONS } from './enable';

export const ELASTIC_CLOUD_INSTRUCTIONS = {
  instructionSets: [
    {
      title: 'Getting Started',
      instructionVariants: [
        {
          id: INSTRUCTION_VARIANT.OSX,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.OSX,
            FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG.OSX,
            ENABLE_INSTRUCTIONS.OSX,
            FILEBEAT_INSTRUCTIONS.START.OSX
          ]
        },
        {
          id: INSTRUCTION_VARIANT.DEB,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.DEB,
            FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG.DEB,
            ENABLE_INSTRUCTIONS.DEB,
            FILEBEAT_INSTRUCTIONS.START.DEB
          ]
        },
        {
          id: INSTRUCTION_VARIANT.RPM,
          instructions: [
            FILEBEAT_INSTRUCTIONS.INSTALL.RPM,
            FILEBEAT_CLOUD_INSTRUCTIONS.CONFIG.RPM,
            ENABLE_INSTRUCTIONS.RPM,
            FILEBEAT_INSTRUCTIONS.START.RPM
          ]
        }
      ]
    }
  ]
};
