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

import { chromeServiceMock } from '../chrome/chrome_service.mock';
import { RenderingService } from './rendering_service';
import { InternalApplicationStart } from '../application';
import { injectedMetadataServiceMock } from '../injected_metadata/injected_metadata_service.mock';

describe('RenderingService#start', () => {
  const getService = ({ legacyMode = false }: { legacyMode?: boolean } = {}) => {
    const rendering = new RenderingService();
    const application = {
      getComponent: () => <div>Hello application!</div>,
    } as InternalApplicationStart;
    const chrome = chromeServiceMock.createStartContract();
    chrome.getHeaderComponent.mockReturnValue(<div>Hello chrome!</div>);
    const injectedMetadata = injectedMetadataServiceMock.createStartContract();
    injectedMetadata.getLegacyMode.mockReturnValue(legacyMode);
    const targetDomElement = document.createElement('div');
    const start = rendering.start({ application, chrome, injectedMetadata, targetDomElement });
    return { start, targetDomElement };
  };

  it('renders application service into provided DOM element', () => {
    const { targetDomElement } = getService();
    expect(targetDomElement.querySelector('div.application')).toMatchInlineSnapshot(`
      <div
        class="application"
      >
        <div>
          Hello application!
        </div>
      </div>
    `);
  });

  it('contains wrapper divs', () => {
    const { targetDomElement } = getService();
    expect(targetDomElement.querySelector('div.app-wrapper')).toBeDefined();
    expect(targetDomElement.querySelector('div.app-wrapper-pannel')).toBeDefined();
  });

  describe('legacyMode', () => {
    it('renders into provided DOM element', () => {
      const { targetDomElement } = getService({ legacyMode: true });
      expect(targetDomElement).toMatchInlineSnapshot(`
          <div>
            <div
              class="content"
              data-test-subj="kibanaChrome"
            >
              <div>
                Hello chrome!
              </div>
              <div />
            </div>
          </div>
      `);
    });

    it('returns a div for the legacy service to render into', () => {
      const {
        start: { legacyTargetDomElement },
        targetDomElement,
      } = getService({ legacyMode: true });
      expect(targetDomElement.contains(legacyTargetDomElement!)).toBe(true);
    });
  });
});
