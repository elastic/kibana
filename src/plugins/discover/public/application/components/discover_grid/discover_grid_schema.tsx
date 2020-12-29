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
import React, { ReactNode } from 'react';
import { EuiCodeBlock } from '@elastic/eui';
import { geoPoint, kibanaJSON, unknownType } from './constants';
import { KBN_FIELD_TYPES } from '../../../../../data/common';

export function getSchemaByKbnType(kbnType: string | undefined) {
  // Default DataGrid schemas: boolean, numeric, datetime, json, currency, string
  switch (kbnType) {
    case KBN_FIELD_TYPES.IP:
    case KBN_FIELD_TYPES.GEO_SHAPE:
    case KBN_FIELD_TYPES.NUMBER:
      return 'numeric';
    case KBN_FIELD_TYPES.BOOLEAN:
      return 'boolean';
    case KBN_FIELD_TYPES.STRING:
      return 'string';
    case KBN_FIELD_TYPES.DATE:
      return 'datetime';
    case KBN_FIELD_TYPES._SOURCE:
      return kibanaJSON;
    case KBN_FIELD_TYPES.GEO_POINT:
      return geoPoint;
    default:
      return unknownType;
  }
}

export function getSchemaDetectors() {
  return [
    {
      type: kibanaJSON,
      detector() {
        return 0; // this schema is always explicitly defined
      },
      sortTextAsc: '',
      sortTextDesc: '',
      icon: '',
      color: '',
    },
    {
      type: unknownType,
      detector() {
        return 0; // this schema is always explicitly defined
      },
      sortTextAsc: '',
      sortTextDesc: '',
      icon: '',
      color: '',
    },
    {
      type: geoPoint,
      detector() {
        return 0; // this schema is always explicitly defined
      },
      sortTextAsc: '',
      sortTextDesc: '',
      icon: 'tokenGeo',
    },
  ];
}

/**
 * Returns custom popover content for certain schemas
 */
export function getPopoverContents() {
  return {
    [geoPoint]: ({ children }: { children: ReactNode }) => {
      return <span className="geo-point">{children}</span>;
    },
    [unknownType]: ({ children }: { children: ReactNode }) => {
      return (
        <EuiCodeBlock isCopyable language="json" paddingSize="none" transparentBackground={true}>
          {children}
        </EuiCodeBlock>
      );
    },
    [kibanaJSON]: ({ children }: { children: ReactNode }) => {
      return (
        <EuiCodeBlock isCopyable language="json" paddingSize="none" transparentBackground={true}>
          {children}
        </EuiCodeBlock>
      );
    },
  };
}
