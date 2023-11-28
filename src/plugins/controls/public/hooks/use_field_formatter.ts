/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { FieldSpec } from '@kbn/data-views-plugin/common';
import { useEffect, useState } from 'react';
import { pluginServices } from '../services';

export const useFieldFormatter = ({
  dataViewId,
  fieldSpec,
}: {
  dataViewId?: string;
  fieldSpec?: FieldSpec;
}) => {
  const {
    dataViews: { get: getDataViewById },
  } = pluginServices.getServices();
  const [fieldFormatter, setFieldFormatter] = useState(() => (toFormat: string) => toFormat);

  /**
   * derive field formatter from fieldSpec and dataViewId
   */
  useEffect(() => {
    (async () => {
      if (!dataViewId || !fieldSpec) return;
      // dataViews are cached, and should always be available without having to hit ES.
      const dataView = await getDataViewById(dataViewId);
      setFieldFormatter(
        () =>
          dataView?.getFormatterForField(fieldSpec).getConverterFor('text') ??
          ((toFormat: string) => toFormat)
      );
    })();
  }, [fieldSpec, dataViewId, getDataViewById]);

  return fieldFormatter;
};
