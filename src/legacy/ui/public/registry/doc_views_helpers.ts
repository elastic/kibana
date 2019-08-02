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
import angular from 'angular';
import chrome from 'ui/chrome';
import { DocViewRenderProps, AngularScope, AngularController } from './doc_views_types';

/**
 * compiling and injecting the give angular template into the given dom node
 * returning a function to cleanup the injected angular element
 */
export async function injectAngularElement(
  domNode: Element,
  template: string,
  scopeProps: DocViewRenderProps,
  controller: AngularController
): Promise<() => void> {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  const rootScope: AngularScope = $injector.get('$rootScope');
  const newScope = Object.assign(rootScope.$new(), scopeProps);
  if (typeof controller === 'function') {
    controller(newScope);
  }
  // @ts-ignore
  const linkFn = $injector.get('$compile')(template)(newScope);
  newScope.$digest();
  angular
    .element(domNode)
    .empty()
    .append(linkFn);

  return () => {
    newScope.$destroy();
  };
}
