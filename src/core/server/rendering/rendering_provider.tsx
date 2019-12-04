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
import { renderToStaticMarkup } from 'react-dom/server';
import { format } from 'prettier';

import { IRenderingProvider, RenderingProviderParams } from './types';
import { createMetadataFactory } from './create_metadata_factory';
import { Template } from './views';

export class RenderingProvider implements IRenderingProvider {
  private readonly getMetadata = createMetadataFactory(this.params);

  constructor(private readonly params: RenderingProviderParams) {}

  public async render(id?: string, includeUserProvidedConfig?: boolean) {
    const metadata = await this.getMetadata(id, includeUserProvidedConfig);
    const markup = `<!DOCTYPE html>${renderToStaticMarkup(<Template metadata={metadata} />)}`;

    return format(markup, { parser: 'html' });
  }
}
