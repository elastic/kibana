/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { Observable, ReplaySubject, fromEventPattern, merge, timer } from 'rxjs';
import { map, switchMap, filter, debounce } from 'rxjs/operators';
import type { View, Spec } from 'vega';
import type { Assign } from '@kbn/utility-types';

interface DebugValues {
  view: Assign<
    {
      _runtime: {
        data: Record<
          string,
          {
            values: {
              value: Array<Record<string, unknown>>;
            };
          }
        >;
        signals: Record<
          string,
          {
            value: unknown;
          }
        >;
      };
    },
    View
  >;
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

const vegaAdapterSignalLabel = i18n.translate('visTypeVega.inspector.vegaAdapter.signal', {
  defaultMessage: 'Signal',
});

const vegaAdapterValueLabel = i18n.translate('visTypeVega.inspector.vegaAdapter.value', {
  defaultMessage: 'Value',
});

/** Get Runtime Scope for Vega View
 * @link https://vega.github.io/vega/docs/api/debugging/#scope
 **/
const getVegaRuntimeScope = (debugValues: DebugValues) => {
  const { data, signals } = debugValues.view._runtime ?? {};

  return { data, signals };
};

const serializeColumns = (item: Record<string, unknown>, columns: string[]) => {
  const nonSerializableFieldLabel = '(..)';

  return columns.reduce((row: Record<string, string>, column) => {
    try {
      const cell = item[column];
      row[column] = typeof cell === 'object' ? JSON.stringify(cell) : `${cell}`;
    } catch (e) {
      row[column] = nonSerializableFieldLabel;
    }
    return row;
  }, {});
};

export class VegaAdapter {
  private debugValuesSubject = new ReplaySubject<DebugValues>();

  bindInspectValues(debugValues: DebugValues) {
    this.debugValuesSubject.next(debugValues);
  }

  getDataSetsSubscription(): Observable<InspectDataSets[]> {
    return this.debugValuesSubject.pipe(
      filter((debugValues) => Boolean(debugValues)),
      map((debugValues) => {
        const runtimeScope = getVegaRuntimeScope(debugValues);

        return Object.keys(runtimeScope.data || []).reduce((acc: InspectDataSets[], key) => {
          const { value } = runtimeScope.data[key].values;

          if (value && value[0]) {
            const columns = Object.keys(value[0]);
            acc.push({
              id: key,
              columns: columns.map((column) => ({ id: column, schema: 'json' })),
              data: value.map((item: Record<string, unknown>) => serializeColumns(item, columns)),
            });
          }
          return acc;
        }, []);
      })
    );
  }

  getSignalsSetsSubscription(): Observable<InspectSignalsSets> {
    const signalsListener = this.debugValuesSubject.pipe(
      filter((debugValues) => Boolean(debugValues)),
      switchMap((debugValues) => {
        const runtimeScope = getVegaRuntimeScope(debugValues);

        return merge(
          ...Object.keys(runtimeScope.signals).map((key: string) =>
            fromEventPattern(
              (handler) => debugValues.view.addSignalListener(key, handler),
              (handler) => debugValues.view.removeSignalListener(key, handler)
            )
          )
        ).pipe(
          debounce((val) => timer(350)),
          map(() => debugValues)
        );
      })
    );

    return merge(this.debugValuesSubject, signalsListener).pipe(
      filter((debugValues) => Boolean(debugValues)),
      map((debugValues) => {
        const runtimeScope = getVegaRuntimeScope(debugValues);

        return {
          columns: [
            { id: vegaAdapterSignalLabel, schema: 'text' },
            { id: vegaAdapterValueLabel, schema: 'json' },
          ],
          data: Object.keys(runtimeScope.signals).map((key: string) =>
            serializeColumns(
              {
                [vegaAdapterSignalLabel]: key,
                [vegaAdapterValueLabel]: runtimeScope.signals[key].value,
              },
              [vegaAdapterSignalLabel, vegaAdapterValueLabel]
            )
          ),
        };
      })
    );
  }

  getSpecSubscription(): Observable<string> {
    return this.debugValuesSubject.pipe(
      filter((debugValues) => Boolean(debugValues)),
      map((debugValues) => JSON.stringify(debugValues.spec, null, 2))
    );
  }
}
