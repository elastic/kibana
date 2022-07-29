/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

export const getValidFilters = (dataView: DataView, filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    const meta = { ...filter.meta };

    if (filter.query?.script) {
      const field = dataView.fields.find((f) => f.name === meta.key);

      // We need to disable scripted filters that are invalid for this data view
      // since we can't guarantee they'll succeed for the current data view and
      // can lead to runtime errors
      if (isValidScriptedFilter(filter, field)) {
        meta.index = dataView.id;
      } else {
        meta.disabled = true;
      }
    } else {
      meta.index = dataView.id;
    }

    return { ...filter, meta };
  });
};

const isValidScriptedFilter = (filter: Filter, field: DataViewField | undefined) => {
  const filterScript = filter.query?.script.script;

  if (!field?.scripted || !filterScript) {
    return false;
  }

  const languagesMatch = filterScript.lang === field.lang;
  const sourceIncludesFieldScript = Boolean(filterScript.source?.includes(field.script));

  return languagesMatch && sourceIncludesFieldScript;
};
