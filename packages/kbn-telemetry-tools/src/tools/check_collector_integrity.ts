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

import { reduce } from 'lodash';
import { difference, flattenKeys, pickDeep } from './utils';
import { ParsedUsageCollection } from './ts_parser';
import { generateMapping, compatibleSchemaTypes } from './manage_schema';
import { kindToDescriptorName } from './serializer';

export function checkMatchingMapping(
  UsageCollections: ParsedUsageCollection[],
  esMapping: any
): any {
  const generatedMapping = generateMapping(UsageCollections);
  return difference(generatedMapping, esMapping);
}

interface IncompatibleDescriptor {
  diff: Record<string, number>;
  collectorPath: string;
  message: string[];
}
export function checkCompatibleTypeDescriptor(
  usageCollections: ParsedUsageCollection[]
): IncompatibleDescriptor[] {
  const results: Array<IncompatibleDescriptor | false> = usageCollections.map(
    ([collectorPath, collectorDetails]) => {
      const typeDescriptorTypes = flattenKeys(
        pickDeep(collectorDetails.fetch.typeDescriptor, 'kind')
      );
      const typeDescriptorKinds = reduce(
        typeDescriptorTypes,
        (acc: any, type: number, key: string) => {
          try {
            acc[key] = kindToDescriptorName(type);
          } catch (err) {
            throw Error(`Unrecognized type (${key}: ${type}) in ${collectorPath}`);
          }
          return acc;
        },
        {} as any
      );

      const schemaTypes = flattenKeys(pickDeep(collectorDetails.schema.value, 'type'));
      const transformedMappingKinds = reduce(
        schemaTypes,
        (acc: any, type: string, key: string) => {
          try {
            acc[key.replace(/.type$/, '.kind')] = compatibleSchemaTypes(type as any);
          } catch (err) {
            throw Error(`Unrecognized type (${key}: ${type}) in ${collectorPath}`);
          }
          return acc;
        },
        {} as any
      );

      const diff: any = difference(typeDescriptorKinds, transformedMappingKinds);
      const diffEntries = Object.entries(diff);

      if (!diffEntries.length) {
        return false;
      }

      return {
        diff,
        collectorPath,
        message: diffEntries.map(([key]) => {
          const interfaceKey = key.replace('.kind', '');
          try {
            const expectedDescriptorType = JSON.stringify(transformedMappingKinds[key], null, 2);
            const actualDescriptorType = JSON.stringify(typeDescriptorKinds[key], null, 2);
            return `incompatible Type key (${collectorDetails.fetch.typeName}.${interfaceKey}): expected (${expectedDescriptorType}) got (${actualDescriptorType}).`;
          } catch (err) {
            throw Error(`Error converting ${key} in ${collectorPath}.\n${err}`);
          }
        }),
      };
    }
  );

  return results.filter((entry): entry is IncompatibleDescriptor => entry !== false);
}

export function checkCollectorIntegrity(UsageCollections: ParsedUsageCollection[], esMapping: any) {
  return UsageCollections;
}
