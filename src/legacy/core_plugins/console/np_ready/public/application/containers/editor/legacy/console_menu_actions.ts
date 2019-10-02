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

// @ts-ignore
import { getEndpointFromPosition } from '../../../../../../public/quarantined/src/autocomplete';

export function autoIndent(editor: any, event: any) {
  editor.autoIndent();
  event.preventDefault();
  editor.focus();
}

export function getDocumentation(editor: any, docLinkVersion: string): Promise<string | null> {
  return new Promise(resolve => {
    editor.getRequestsInRange((requests: any) => {
      if (!requests || requests.length === 0) {
        resolve(null);
        return;
      }
      const position = requests[0].range.end;
      position.column = position.column - 1;
      const endpoint = getEndpointFromPosition(editor, position);
      if (endpoint && endpoint.documentation && endpoint.documentation.indexOf('http') !== -1) {
        const nextDocumentation = endpoint.documentation
          .replace('/master/', `/${docLinkVersion}/`)
          .replace('/current/', `/${docLinkVersion}/`);
        resolve(nextDocumentation);
      } else {
        resolve(null);
      }
    });
  });
}
