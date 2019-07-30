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
import chrome from 'ui/chrome';
import { Scope } from './doc_viewer_types';
/**
 * compiles the angular markup provided by domElement
 * injects scope with given scopeProps
 * returns a function to cleanup
 * @param domElement
 * @param scopeProps
 * @param controller
 */
export async function compileAngular(
  domElement: unknown,
  scopeProps: object,
  controller?: (scope: Scope) => void
): Promise<() => void> {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  const rootScope: Scope = $injector.get('$rootScope');
  const newScope: Scope = Object.assign(rootScope.$new(), scopeProps);
  if (controller) {
    controller(newScope);
  }
  // @ts-ignore
  $injector.get('$compile')(domElement)(newScope);
  newScope.$digest();
  return () => {
    newScope.$destroy();
  };
}
