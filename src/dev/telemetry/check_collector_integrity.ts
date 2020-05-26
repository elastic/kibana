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

import * as _ from 'lodash';
import { difference, flattenKeys, pickDeep } from './utils';
import { ParsedUsageCollection } from './ts_parser';
import { generateMapping, getMappingTypeToKind } from './manage_mapping';
import { kindToDescriptorName } from './serializer';

export function checkMatchingMapping(UsageCollections: ParsedUsageCollection[], esMapping: any) {
  const generatedMapping = generateMapping(UsageCollections);
  return difference(generatedMapping, esMapping);
}

export function checkCompatibleTypeDescriptor(usageCollections: ParsedUsageCollection[]) {
  return usageCollections.map(([, collectorDetails]) => {
    const typeDescriptorKinds = flattenKeys(
      pickDeep(collectorDetails.fetch.typeDescriptor, 'kind')
    );
    const mappingTypes = flattenKeys(pickDeep(collectorDetails.mapping.value, 'type'));

    const transformedMappingKinds = _.reduce(
      mappingTypes,
      (acc: any, type: string, key: string) => {
        acc[key.replace('.type', '.kind')] = getMappingTypeToKind(type);
        return acc;
      },
      {} as any
    );

    const diff: any[] = difference(typeDescriptorKinds, transformedMappingKinds);

    return {
      diff,
      message: Object.entries(diff).map(([key]) => {
        const interfaceKey = key.replace('.kind', '');
        const expectedDescriptorType = kindToDescriptorName(_.get(transformedMappingKinds, key));
        const actualDescriptorType = kindToDescriptorName(_.get(typeDescriptorKinds, key));
        return `incompatible Type key (${collectorDetails.fetch.typeName}.${interfaceKey}): expected (${expectedDescriptorType}) got (${actualDescriptorType}).`;
      }),
    };
  });
}

export function checkCollectorIntegrity(UsageCollections: ParsedUsageCollection[], esMapping: any) {
  return UsageCollections;
}
