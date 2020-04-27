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

import { SavedObjectUnsanitizedDoc } from 'kibana/server';
import { DashboardDoc730ToLatest } from '../../common';

function isDoc(
  doc: { [key: string]: unknown } | SavedObjectUnsanitizedDoc
): doc is SavedObjectUnsanitizedDoc {
  return (
    typeof doc.id === 'string' &&
    typeof doc.type === 'string' &&
    doc.attributes !== null &&
    typeof doc.attributes === 'object' &&
    doc.references !== null &&
    typeof doc.references === 'object'
  );
}

export function isDashboardDoc(
  doc: { [key: string]: unknown } | DashboardDoc730ToLatest
): doc is DashboardDoc730ToLatest {
  if (!isDoc(doc)) {
    return false;
  }

  if (typeof (doc as DashboardDoc730ToLatest).attributes.panelsJSON !== 'string') {
    return false;
  }

  return true;
}
