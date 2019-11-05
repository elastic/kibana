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

export const formatAttachDownload = (value: boolean, field: any, hit: any) => {
  if (!value) {
    return '';
  }

  const session = hit && hit._source && hit._source.Session ? hit._source.Session : '';

  const fileName = hit && hit._source && hit._source.Filename ? hit._source.Filename : '';

  const captured = hit && hit._source && hit._source.Captured ? true : false;

  return `<attach-download session="'${session}'" fileName="'${fileName}'" captured="${captured}"></attach-download>`;
};

export const formatCaptureDownload = (value: boolean, field: any, hit: any) => {
  if (!value) {
    return '';
  }

  const session = hit && hit._source && hit._source.Session ? hit._source.Session : '';

  return `<capture-download session="'${session}'"></capture-download>`;
};

export const formatNetmonBoolean = (value: boolean, field: any, hit: any) => {
  switch (field.name) {
    case 'Attach':
      return formatAttachDownload(value, field, hit);
    case 'Captured':
      return formatCaptureDownload(value, field, hit);
    default:
      return '';
  }
};
