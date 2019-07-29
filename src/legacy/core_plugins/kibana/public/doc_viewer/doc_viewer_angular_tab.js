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
import React, { useRef, useEffect } from 'react';
import chrome from 'ui/chrome';

async function compileAngular(domElement, scopeProps, controller) {
  const $injector = await chrome.dangerouslyGetActiveInjector();
  const $rootScope = $injector.get('$rootScope');
  const newScope = Object.assign($rootScope.$new(), scopeProps);
  if (controller) {
    controller(newScope);
  }
  const $compile = $injector.get('$compile');
  $compile(domElement)(newScope);
  newScope.$digest();
  return newScope;
}

export function DocViewerAngularTab(props) {
  const containerRef = useRef();
  const { template, controller } = props.directive;
  useEffect(() => {
    const newScope = compileAngular(containerRef.current, props.renderProps, controller);

    return () => {
      // for cleanup
      // http://roubenmeschian.com/rubo/?p=51
      newScope.$destroy;
    };
  });

  /*
   * Justification for dangerouslySetInnerHTML:
   * Angular template needs to be set as innerHTML before compiling it.
   */
  /* eslint-disable react/no-danger */
  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: template }} />;
}
