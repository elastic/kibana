/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
enum TELEMETRY_EVENT {
  GROUP_TOGGLED = 'alerts_table_toggled_',
  GROUPED_ALERTS = 'alerts_table_group_by_',
}

export const getTelemetryEvent = {
  groupToggled: ({
    isOpen,
    groupingId,
    groupNumber,
  }: {
    isOpen: boolean;
    groupingId: string;
    groupNumber: number;
  }) =>
    `${TELEMETRY_EVENT.GROUP_TOGGLED}${isOpen ? 'on' : 'off'}_${groupingId}_group-${groupNumber}`,
  groupChanged: ({ groupingId, selected }: { groupingId: string; selected: string }) =>
    `${TELEMETRY_EVENT.GROUPED_ALERTS}${groupingId}_${selected}`,
};
