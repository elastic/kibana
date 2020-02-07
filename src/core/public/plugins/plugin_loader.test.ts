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

import { CoreWindow, loadPluginBundle } from './plugin_loader';

let createdScriptTags = [] as any[];
let appendChildSpy: jest.SpyInstance<Node, [Node]>;
let createElementSpy: jest.SpyInstance<
  HTMLElement,
  [string, (ElementCreationOptions | undefined)?]
>;

const coreWindow = (window as unknown) as CoreWindow;

beforeEach(() => {
  // Mock document.createElement to return fake tags we can use to inspect what
  // loadPluginBundles does.
  createdScriptTags = [];
  createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(() => {
    const scriptTag = { setAttribute: jest.fn() } as any;
    createdScriptTags.push(scriptTag);
    return scriptTag;
  });

  // Mock document.body.appendChild to avoid errors about appending objects that aren't `Node`'s
  // and so we can verify that the script tags were added to the page.
  appendChildSpy = jest.spyOn(document.body, 'appendChild').mockReturnValue({} as any);

  // Mock global fields needed for loading modules.
  coreWindow.__kbnBundles__ = {};
});

afterEach(() => {
  appendChildSpy.mockRestore();
  createElementSpy.mockRestore();
  delete coreWindow.__kbnBundles__;
});

const addBasePath = (path: string) => path;

test('`loadPluginBundles` creates a script tag and loads initializer', async () => {
  const loadPromise = loadPluginBundle(addBasePath, 'plugin-a');

  // Verify it sets up the script tag correctly and adds it to document.body
  expect(createdScriptTags).toHaveLength(1);
  const fakeScriptTag = createdScriptTags[0];
  expect(fakeScriptTag.setAttribute).toHaveBeenCalledWith(
    'src',
    '/bundles/plugin/plugin-a.bundle.js'
  );
  expect(fakeScriptTag.setAttribute).toHaveBeenCalledWith('id', 'kbn-plugin-plugin-a');
  expect(fakeScriptTag.onload).toBeInstanceOf(Function);
  expect(fakeScriptTag.onerror).toBeInstanceOf(Function);
  expect(appendChildSpy).toHaveBeenCalledWith(fakeScriptTag);

  // Setup a fake initializer as if a plugin bundle had actually been loaded.
  const fakeInitializer = jest.fn();
  coreWindow.__kbnBundles__['plugin/plugin-a'] = fakeInitializer;
  // Call the onload callback
  fakeScriptTag.onload();
  await expect(loadPromise).resolves.toEqual(fakeInitializer);
});

test('`loadPluginBundles` includes the basePath', async () => {
  loadPluginBundle((path: string) => `/mybasepath${path}`, 'plugin-a');

  // Verify it sets up the script tag correctly and adds it to document.body
  expect(createdScriptTags).toHaveLength(1);
  const fakeScriptTag = createdScriptTags[0];
  expect(fakeScriptTag.setAttribute).toHaveBeenCalledWith(
    'src',
    '/mybasepath/bundles/plugin/plugin-a.bundle.js'
  );
});

test('`loadPluginBundles` rejects if script.onerror is called', async () => {
  const loadPromise = loadPluginBundle(addBasePath, 'plugin-a');
  const fakeScriptTag1 = createdScriptTags[0];
  // Call the error on the second script
  fakeScriptTag1.onerror(new Error('Whoa there!'));

  await expect(loadPromise).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Failed to load \\"plugin-a\\" bundle (/bundles/plugin/plugin-a.bundle.js)"`
  );
});

test('`loadPluginBundles` rejects if timeout is reached', async () => {
  await expect(
    // Override the timeout to 1 ms for testi.
    loadPluginBundle(addBasePath, 'plugin-a', { timeoutMs: 1 })
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Timeout reached when loading \\"plugin-a\\" bundle (/bundles/plugin/plugin-a.bundle.js)"`
  );
});

test('`loadPluginBundles` rejects if bundle does attach an initializer to window.__kbnBundles__', async () => {
  const loadPromise = loadPluginBundle(addBasePath, 'plugin-a');

  const fakeScriptTag1 = createdScriptTags[0];

  // Setup a fake initializer as if a plugin bundle had actually been loaded.
  coreWindow.__kbnBundles__['plugin/plugin-a'] = undefined;
  // Call the onload callback
  fakeScriptTag1.onload();

  await expect(loadPromise).rejects.toThrowErrorMatchingInlineSnapshot(
    `"Definition of plugin \\"plugin-a\\" should be a function (/bundles/plugin/plugin-a.bundle.js)."`
  );
});
