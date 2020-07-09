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
import { View, Runtime, Spec } from 'vega';
import { i18n } from '@kbn/i18n';
import { Assign } from '@kbn/utility-types';

interface DebugValues {
  view: View;
  spec: Spec;
}

export interface VegaRuntimeData {
  columns: Array<{
    id: string;
  }>;
  data: Array<Record<string, string>>;
}

export type InspectDataSets = Assign<VegaRuntimeData, { id: string }>;
export type InspectSignalsSets = VegaRuntimeData;

/** Get Runtime Scope for Vega View
 * @link https://vega.github.io/vega/docs/api/debugging/#scope
 **/
const getVegaRuntimeScope = (debugValues: DebugValues) =>
  (debugValues.view as any)._runtime as Runtime;

const serializeColumns = (item: Record<string, unknown>, columns: string[]) => {
  const nonSerializableFieldLabel = '(..)';

  return columns.reduce((row: Record<string, string>, column) => {
    try {
      row[column] = JSON.stringify(item[column]);
    } catch (e) {
      row[column] = nonSerializableFieldLabel;
    }
    return row;
  }, {});
};

const mapColumns = (columns: string[]) => columns.map((column) => ({ id: column, schema: 'json' }));

export class VegaAdapter {
  private debugValues?: DebugValues;

  bindDebugValues(debugValues: DebugValues) {
    this.debugValues = debugValues;
  }

  getDataSets(): InspectDataSets[] {
    const runtimeScope = getVegaRuntimeScope(this.debugValues!);

    return Object.keys(runtimeScope.data || []).reduce((acc: InspectDataSets[], key) => {
      const value = runtimeScope.data[key].values.value;

      if (value && value[0]) {
        const columns = Object.keys(value[0]);
        acc.push({
          id: key,
          columns: mapColumns(columns),
          data: value.map((item: Record<string, unknown>) => serializeColumns(item, columns)),
        });
      }
      return acc;
    }, []);
  }

  getSignalsSets(): InspectSignalsSets {
    const runtimeScope = getVegaRuntimeScope(this.debugValues!);
    const columns = [
      i18n.translate('visTypeVega.inspector.vegaAdapter.signal', {
        defaultMessage: 'Signal',
      }),
      i18n.translate('visTypeVega.inspector.vegaAdapter.value', {
        defaultMessage: 'Value',
      }),
    ];

    return {
      columns: mapColumns(columns),
      data: Object.keys(runtimeScope.signals).map((key: string) => {
        return serializeColumns(
          {
            [columns[0]]: key,
            [columns[1]]: runtimeScope.signals[key].value,
          },
          columns
        );
      }),
    };
  }

  getSpec(): string {
    return JSON.stringify(this.debugValues!.spec, null, 2);
  }
}
