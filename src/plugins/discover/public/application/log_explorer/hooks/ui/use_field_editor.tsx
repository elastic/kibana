/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useRef, useEffect, useMemo } from 'react';
import { DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const useFieldEditor = ({
  dataView,
  onFieldEdited,
}: {
  dataView: DataView;
  onFieldEdited: () => void;
}) => {
  const { dataViewFieldEditor } = useDiscoverServices();
  const closeFieldEditor = useRef<() => void | undefined>();

  useEffect(() => {
    return () => {
      if (closeFieldEditor?.current) {
        closeFieldEditor?.current();
      }
    };
  }, []);

  const editField = useMemo(
    () =>
      onFieldEdited
        ? (fieldName: string) => {
            closeFieldEditor.current = dataViewFieldEditor.openEditor({
              ctx: {
                dataView,
              },
              fieldName,
              onSave: async () => {
                onFieldEdited();
              },
            });
          }
        : undefined,
    [dataView, onFieldEdited, dataViewFieldEditor]
  );

  return { editField };
};
