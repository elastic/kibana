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
import React from 'react';

interface Props {
  type: string;
  label: string;
}

export function FieldNameIcon({ type, label }: Props) {
  switch (type) {
    case 'boolean':
      return <span aria-label={label} className="dscField__icon kuiIcon fa-adjust"></span>;

    case 'conflict':
      return <span aria-label={label} className="dscField__icon kuiIcon fa-warning"></span>;

    case 'date':
      return <span aria-label={label} className="dscField__icon kuiIcon fa-clock-o"></span>;

    case 'geo_point':
      return <span aria-label={label} className="dscField__icon kuiIcon fa-globe"></span>;

    case 'geo_shape':
      return <span aria-label={label} className="dscField__icon kuiIcon fa-globe"></span>;

    case 'ip':
      return <span aria-label={label} className="dscField__icon kuiIcon fa-laptop"></span>;

    case 'murmur3':
      return (
        <span aria-label={label} className="dscField__icon">
          <strong aria-hidden="true">h</strong>
        </span>
      );

    case 'number':
      return (
        <span aria-label={label} className="dscField__icon">
          <strong aria-hidden="true">#</strong>
        </span>
      );

    case 'source':
      // Note that this type is currently not provided, type for _source is undefined
      return <span aria-label={label} className="dscField__icon kuiIcon fa-file-text-o"></span>;

    case 'string':
      return (
        <span aria-label={label} className="dscField__icon">
          <strong aria-hidden="true">t</strong>
        </span>
      );

    default:
      return (
        <span aria-label={label} className="dscField__icon">
          <strong aria-hidden="true">?</strong>
        </span>
      );
  }
}
