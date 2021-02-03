/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Returns dashboard id from URL
 * literally looks from id after `dashboard/` string and before `/`, `?` and end of string
 * @param url to extract dashboardId from
 * input: http://localhost:5601/lib/app/kibana#/dashboard?param1=x&param2=y&param3=z
 * output: undefined
 * input: http://localhost:5601/lib/app/kibana#/dashboard/39292992?param1=x&param2=y&param3=z
 * output: 39292992
 */
export function getDashboardIdFromUrl(url: string): string | undefined {
  const [, dashboardId] = url.match(/view\/(.*?)(\/|\?|$)/) ?? [
    undefined, // full match
    undefined, // group with dashboardId
  ];
  return dashboardId ?? undefined;
}
