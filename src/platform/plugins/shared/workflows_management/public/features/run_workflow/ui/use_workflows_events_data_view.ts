/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';
import type { ToastsStart } from '@kbn/core/public';
import type {
  DataView,
  DataViewsPublicPluginStart,
  FieldSpec,
} from '@kbn/data-views-plugin/public';
import type { DataViewFieldBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { WORKFLOWS_EVENTS_DATA_STREAM, WORKFLOWS_EVENTS_DATA_VIEW_FIELDS } from '@kbn/workflows';

/** Fields hidden from KQL autocomplete (space is enforced server-side; `kibana.*` is index metadata). */
const WORKFLOW_TRIGGER_EVENTS_KQL_SUPPRESSED_FIELD_NAMES = new Set(['spaceId', 'kibana.space_ids']);

function workflowsEventsKqlFieldToFieldSpec(field: DataViewFieldBase): FieldSpec {
  const isObject = field.type === 'object';
  return {
    ...field,
    searchable: true,
    aggregatable: !isObject,
    readFromDocValues: !isObject,
    isMapped: true,
  };
}

const WORKFLOWS_EVENTS_KQL_FALLBACK_FIELDS: FieldSpec[] = WORKFLOWS_EVENTS_DATA_VIEW_FIELDS.map(
  workflowsEventsKqlFieldToFieldSpec
);

function stripWorkflowTriggerEventKqlSuppressedFields(dataView: DataView): void {
  const toRemove = dataView.fields
    .getAll()
    .filter((field) => WORKFLOW_TRIGGER_EVENTS_KQL_SUPPRESSED_FIELD_NAMES.has(field.name));
  for (const field of toRemove) {
    dataView.fields.remove(field);
  }
}

function applyWorkflowsEventsKqlFallbackFields(dataView: DataView): void {
  if (!dataView.getFieldByName('triggerId')) {
    dataView.fields.replaceAll(WORKFLOWS_EVENTS_KQL_FALLBACK_FIELDS);
  }
  stripWorkflowTriggerEventKqlSuppressedFields(dataView);
}

export function useWorkflowsEventsDataView(options: {
  dataViews: DataViewsPublicPluginStart | undefined;
  toasts: ToastsStart;
}): DataView | null {
  const { dataViews, toasts } = options;
  const [dataView, setDataView] = useState<DataView | null>(null);
  const dataViewCreatingRef = useRef(false);

  useEffect(() => {
    if (!dataViews || dataViewCreatingRef.current) {
      return;
    }
    dataViewCreatingRef.current = true;

    let cancelled = false;

    const create = async () => {
      try {
        const created = await dataViews.create({
          title: WORKFLOWS_EVENTS_DATA_STREAM,
          timeFieldName: '@timestamp',
          allowHidden: true,
        });
        if (cancelled) {
          return;
        }
        try {
          await dataViews.refreshFields(created, false, true);
        } catch {
          if (cancelled) {
            return;
          }
          toasts.addWarning({
            title: i18n.translate(
              'workflows.workflowExecuteEventTriggerForm.refreshFieldsWarningTitle',
              {
                defaultMessage: 'Limited field suggestions',
              }
            ),
            text: i18n.translate(
              'workflows.workflowExecuteEventTriggerForm.refreshFieldsWarningBody',
              {
                defaultMessage:
                  'Could not refresh fields for .workflows-events. Type field names manually (e.g. triggerId, eventId, payload.*).',
              }
            ),
          });
        }
        if (cancelled) {
          return;
        }
        applyWorkflowsEventsKqlFallbackFields(created);
        setDataView(created);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setDataView(null);
        toasts.addError(error instanceof Error ? error : new Error(String(error)), {
          title: i18n.translate(
            'workflows.workflowExecuteEventTriggerForm.dataViewCreateErrorTitle',
            {
              defaultMessage: 'Could not prepare trigger event search',
            }
          ),
          toastMessage: i18n.translate(
            'workflows.workflowExecuteEventTriggerForm.dataViewCreateErrorBody',
            {
              defaultMessage:
                'Creating a data view for .workflows-events failed. Check data view privileges or try again.',
            }
          ),
        });
      } finally {
        if (!cancelled) {
          dataViewCreatingRef.current = false;
        }
      }
    };

    create();

    return () => {
      cancelled = true;
      dataViewCreatingRef.current = false;
    };
  }, [dataViews, toasts]);

  return dataView;
}
