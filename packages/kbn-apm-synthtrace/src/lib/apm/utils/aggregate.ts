/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { pickBy } from 'lodash';
import objectHash from 'object-hash';
import { ApmFields } from '../apm_fields';
import { createPicker } from './create_picker';

export function aggregate(events: ApmFields[], fields: string[]) {
  const picker = createPicker(fields);

  const metricsets = new Map<string, { key: ApmFields; events: ApmFields[] }>();

  function getMetricsetKey(span: ApmFields) {
    const timestamp = moment(span['@timestamp']).valueOf();
    return {
      '@timestamp': timestamp - (timestamp % (60 * 1000)),
      ...pickBy(span, picker),
    };
  }

  for (const event of events) {
    const key = getMetricsetKey(event);
    const id = objectHash(key);

    let metricset = metricsets.get(id);
    if (!metricset) {
      metricset = {
        key: { ...key, 'processor.event': 'metric', 'processor.name': 'metric' },
        events: [],
      };
      metricsets.set(id, metricset);
    }
    metricset.events.push(event);
  }

  return Array.from(metricsets.values());
}
